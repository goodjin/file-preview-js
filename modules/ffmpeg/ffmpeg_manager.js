import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

async function tryLoadFfmpegStaticPath() {
  try {
    const mod = await import("ffmpeg-static");
    const candidate = mod?.default ?? mod;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    return null;
  } catch {
    return null;
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

function normalizeIndexNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) return null;
  return n;
}

function ensureIndexInRange(index, length) {
  return index >= 0 && index < length;
}

function pushBoundedLines(target, line, maxLines) {
  target.push(line);
  if (target.length > maxLines) {
    target.splice(0, target.length - maxLines);
  }
}

export class FfmpegManager {
  constructor(runtime, moduleConfig, log) {
    this.runtime = runtime;
    this.moduleConfig = moduleConfig ?? {};
    this.log = log ?? console;
    this.tasks = new Map();
    this.maxStderrLines = 200;
  }

  async run(ctx, input) {
    const taskId = randomUUID();
    const nowIso = new Date().toISOString();

    const task = {
      taskId,
      status: "pending",
      createdAt: nowIso,
      startedAt: null,
      completedAt: null,
      exitCode: null,
      error: null,
      pid: null,
      outputArtifactIds: [],
      outputFiles: [],
      logArtifactIds: [],
      stdoutLogPath: null,
      stderrLogPath: null,
      progress: {
        ratio: null,
        raw: {},
        lastStderrLines: []
      }
    };

    this.tasks.set(taskId, task);

    const messageId = ctx?.currentMessage?.id ?? null;
    const createdByAgentId = ctx?.agent?.id ?? null;

    const fail = (error, message) => {
      task.status = "failed";
      task.error = error;
      task.completedAt = new Date().toISOString();
      if (message) {
        pushBoundedLines(task.progress.lastStderrLines, String(message), this.maxStderrLines);
      }
      const artifactIds = [];
      if (Array.isArray(task.outputArtifactIds)) artifactIds.push(...task.outputArtifactIds);
      if (Array.isArray(task.logArtifactIds)) artifactIds.push(...task.logArtifactIds);
      const res = { taskId, status: task.status, error, message, outputArtifactIds: task.outputArtifactIds, logArtifactIds: task.logArtifactIds };
      if (artifactIds.length > 0) res.artifactIds = artifactIds;
      return res;
    };

    const argv = normalizeStringArray(input?.argv);
    if (!argv) {
      return fail("invalid_parameter", "argv 必须是字符串数组");
    }

    const ffmpegPath = await this._resolveFfmpegPath();
    if (!ffmpegPath) {
      return fail("ffmpeg_not_found", "未找到 ffmpeg 可执行文件");
    }

    const finalArgv = [...argv];

    const inputs = Array.isArray(input?.inputs) ? input.inputs : [];
    for (const item of inputs) {
      const index = normalizeIndexNumber(item?.index);
      const artifactId = typeof item?.artifactId === "string" ? item.artifactId.trim() : "";
      if (index === null || !ensureIndexInRange(index, finalArgv.length) || !artifactId) {
        return fail("invalid_input_mapping", "inputs 参数不合法");
      }

      const filePath = await ctx.tools.resolveArtifactFilePath(artifactId);
      if (!filePath) {
        return fail("input_artifact_not_found", `输入工件不存在或无法解析路径: ${artifactId}`);
      }

      finalArgv[index] = filePath;
    }

    const outputs = Array.isArray(input?.outputs) ? input.outputs : [];
    for (const item of outputs) {
      const index = normalizeIndexNumber(item?.index);
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const type = typeof item?.type === "string" && item.type.trim() ? item.type.trim() : null;

      if (index === null || !ensureIndexInRange(index, finalArgv.length) || !name) {
        return fail("invalid_output_mapping", "outputs 参数不合法");
      }

      const reserved = await ctx.tools.reserveArtifactFile({
        name,
        type,
        messageId,
        createdByAgentId,
        meta: {
          module: "ffmpeg",
          taskId,
          role: "ffmpeg_output"
        }
      });

      if (!reserved?.artifactId || !reserved?.filePath) {
        return fail("reserve_output_failed", "预留输出工件失败");
      }

      task.outputArtifactIds.push(reserved.artifactId);
      task.outputFiles.push({ artifactId: reserved.artifactId, filePath: reserved.filePath, name, type });
      finalArgv[index] = reserved.filePath;
    }

    const replacements = Array.isArray(input?.replacements) ? input.replacements : [];
    for (const item of replacements) {
      const index = normalizeIndexNumber(item?.index);
      const placeholder = typeof item?.placeholder === "string" ? item.placeholder : "";
      const artifactId = typeof item?.artifactId === "string" ? item.artifactId.trim() : "";

      if (index === null || !ensureIndexInRange(index, finalArgv.length) || !placeholder || !artifactId) {
        return fail("invalid_replacements", "replacements 参数不合法");
      }

      const filePath = await ctx.tools.resolveArtifactFilePath(artifactId);
      if (!filePath) {
        return fail("replacement_artifact_not_found", `替换用工件不存在或无法解析路径: ${artifactId}`);
      }

      const raw = String(finalArgv[index] ?? "");
      if (!raw.includes(placeholder)) {
        return fail("replacement_placeholder_not_found", `argv[${index}] 不包含 placeholder`);
      }

      finalArgv[index] = raw.split(placeholder).join(filePath);
    }

    const logDir = path.resolve(this.runtime.config.runtimeDir, "ffmpeg");
    await mkdir(logDir, { recursive: true });
    task.stdoutLogPath = path.join(logDir, `${taskId}.stdout.log`);
    task.stderrLogPath = path.join(logDir, `${taskId}.stderr.log`);

    const stdoutStream = createWriteStream(task.stdoutLogPath, { flags: "a" });
    const stderrStream = createWriteStream(task.stderrLogPath, { flags: "a" });

    task.status = "running";
    task.startedAt = new Date().toISOString();
    // 记录 ffmpeg 路径与最终参数
    this.log.info?.("[FFmpeg] 启动任务", {
      taskId,
      ffmpegPath,
      finalArgv,
      stdoutLogPath: task.stdoutLogPath,
      stderrLogPath: task.stderrLogPath
    });

    const child = spawn(ffmpegPath, finalArgv, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    task.pid = child.pid ?? null;

    child.stdout?.on("data", (chunk) => {
      try {
        stdoutStream.write(chunk);
      } catch {}
    });

    let stderrBuffer = "";
    child.stderr?.on("data", (chunk) => {
      try {
        stderrStream.write(chunk);
      } catch {}

      stderrBuffer += chunk.toString("utf8");
      const parts = stderrBuffer.split(/\r?\n/);
      stderrBuffer = parts.pop() ?? "";
      for (const line of parts) {
        this._handleStderrLine(task, line);
      }
    });

    const finalizeStreams = async () => {
      await Promise.allSettled([
        new Promise((resolve) => stdoutStream.end(resolve)),
        new Promise((resolve) => stderrStream.end(resolve))
      ]);
    };

    child.on("error", async (err) => {
      task.status = "failed";
      task.error = err?.message ?? String(err);
      pushBoundedLines(task.progress.lastStderrLines, `spawn_error: ${task.error}`, this.maxStderrLines);
      task.completedAt = new Date().toISOString();
      await finalizeStreams();
    });

    child.on("close", async (code) => {
      task.exitCode = typeof code === "number" ? code : null;
      task.completedAt = new Date().toISOString();
      task.status = code === 0 ? "completed" : "failed";
      if (code !== 0) {
        task.error = task.error || `ffmpeg_exit_${code}`;
        pushBoundedLines(task.progress.lastStderrLines, `exit_code: ${code}`, this.maxStderrLines);
      }
      await finalizeStreams();
    });

    return {
      taskId,
      outputArtifactIds: task.outputArtifactIds,
      artifactIds: task.outputArtifactIds
    };
  }

  async getStatus(ctx, taskId) {
    const task = this.tasks.get(String(taskId));
    if (!task) return { error: "task_not_found", message: "任务不存在", taskId };

    if ((task.status === "completed" || task.status === "failed") && task.logArtifactIds.length === 0) {
      await this._ensureLogArtifacts(ctx, task);
    }

    const response = {
      taskId: task.taskId,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      pid: task.pid,
      exitCode: task.exitCode,
      error: task.error,
      progress: task.progress,
      outputArtifactIds: task.outputArtifactIds,
      logArtifactIds: task.logArtifactIds
    };

    if (task.status === "failed") {
      response.failure = {
        error: task.error,
        exitCode: task.exitCode,
        stderrTail: Array.isArray(task.progress?.lastStderrLines) ? task.progress.lastStderrLines : []
      };
    }

    const artifactIds = [];
    if (Array.isArray(task.outputArtifactIds)) artifactIds.push(...task.outputArtifactIds);
    if (Array.isArray(task.logArtifactIds)) artifactIds.push(...task.logArtifactIds);
    if (artifactIds.length > 0) response.artifactIds = artifactIds;

    return response;
  }

  listTasks() {
    const tasks = [];
    for (const task of this.tasks.values()) {
      tasks.push({
        taskId: task.taskId,
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        exitCode: task.exitCode,
        error: task.error,
        outputArtifactIds: task.outputArtifactIds
      });
    }
    tasks.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { ok: true, tasks };
  }

  async _resolveFfmpegPath() {
    const configured = typeof this.moduleConfig.ffmpegPath === "string" ? this.moduleConfig.ffmpegPath.trim() : "";
    if (configured) return configured;

    const staticPath = await tryLoadFfmpegStaticPath();
    if (staticPath) return staticPath;

    return "ffmpeg";
  }

  _handleStderrLine(task, line) {
    const text = String(line ?? "").trimEnd();
    if (!text) return;

    pushBoundedLines(task.progress.lastStderrLines, text, this.maxStderrLines);

    const timeMatch = /time=\s*([0-9:.]+)/.exec(text);
    if (timeMatch?.[1]) {
      task.progress.raw.time = timeMatch[1];
    }

    const frameMatch = /frame=\s*([0-9]+)/.exec(text);
    if (frameMatch?.[1]) {
      task.progress.raw.frame = Number(frameMatch[1]);
    }

    const fpsMatch = /fps=\s*([0-9.]+)/.exec(text);
    if (fpsMatch?.[1]) {
      task.progress.raw.fps = Number(fpsMatch[1]);
    }
  }

  async _ensureLogArtifacts(ctx, task) {
    const messageId = ctx?.currentMessage?.id ?? null;
    const createdByAgentId = ctx?.agent?.id ?? null;

    try {
      const stdout = task.stdoutLogPath ? await readFile(task.stdoutLogPath, "utf8") : "";
      const stderr = task.stderrLogPath ? await readFile(task.stderrLogPath, "utf8") : "";

      if (stdout) {
        const id = await ctx.tools.putArtifact({
          name: `ffmpeg-${task.taskId}-stdout.log`,
          type: "text/plain",
          content: stdout,
          messageId,
          meta: { module: "ffmpeg", taskId: task.taskId, role: "stdout", createdByAgentId }
        });
        task.logArtifactIds.push(id);
      }

      if (stderr) {
        const id = await ctx.tools.putArtifact({
          name: `ffmpeg-${task.taskId}-stderr.log`,
          type: "text/plain",
          content: stderr,
          messageId,
          meta: { module: "ffmpeg", taskId: task.taskId, role: "stderr", createdByAgentId }
        });
        task.logArtifactIds.push(id);
      }
    } catch (err) {
      void this.log.warn?.("[FFmpeg] 写入日志工件失败", { taskId: task.taskId, error: err?.message ?? String(err) });
    }
  }
}
