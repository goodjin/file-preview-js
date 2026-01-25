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

/**
 * 将一段命令行参数字符串解析为 argv 数组。
 *
 * 设计目的：
 * - 工具侧接收“完整参数字符串”，但内部仍使用 spawn(ffmpegPath, argv) 以避免 shell 注入风险。
 *
 * 解析规则（最小可用子集）：
 * - 以空白字符分隔参数
 * - 支持单引号与双引号包裹（引号本身不进入结果）
 * - 支持反斜杠转义（在双引号内与非引号环境生效；单引号内反斜杠视为普通字符）
 *
 * @param {string} vargs - 不包含程序名的参数字符串
 * @returns {{ok:true, argv:string[]} | {ok:false, error:string, message:string}}
 */
function parseVargsToArgv(vargs) {
  if (typeof vargs !== "string" || !vargs.trim()) {
    return { ok: false, error: "invalid_parameter", message: "vargs 必须是非空字符串" };
  }

  const argv = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaping = false;

  const pushToken = () => {
    if (current !== "") argv.push(current);
    current = "";
  };

  for (let i = 0; i < vargs.length; i++) {
    const ch = vargs[i];

    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }

    if (!inSingleQuote && ch === "\\") {
      const next = i + 1 < vargs.length ? vargs[i + 1] : "";
      const shouldEscape =
        (inDoubleQuote && (next === '"' || next === "\\")) ||
        (!inDoubleQuote && (next === '"' || next === "'" || next === "\\" || /\s/.test(next)));
      if (shouldEscape) {
        escaping = true;
        continue;
      }
      current += "\\";
      continue;
    }

    if (!inDoubleQuote && ch === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && ch === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(ch)) {
      pushToken();
      continue;
    }

    current += ch;
  }

  if (escaping) {
    current += "\\";
  }
  if (inSingleQuote || inDoubleQuote) {
    return { ok: false, error: "invalid_parameter", message: "vargs 引号不匹配" };
  }

  pushToken();
  return { ok: true, argv };
}

/**
 * 解析输出占位符参数。
 *
 * 规则：
 * - 允许 "$FFMEPG_OUTPUT" 或 "$FFMPEG_OUTPUT"
 * - 允许在其后追加扩展名，例如 "$FFMEPG_OUTPUT.mp4" 或 "$FFMEPG_OUTPUT.tar.gz"
 * - 必须是“整个参数值”，不支持嵌入在更长字符串中（避免歧义）
 *
 * @param {string} token - 单个 argv 参数
 * @returns {{ok:true, ext:string|null} | {ok:false}}
 */
function parseOutputPlaceholderToken(token) {
  const raw = String(token ?? "");
  const m = /^\$(FFMEPG|FFMPEG)_OUTPUT((\.[A-Za-z0-9]+)+)?$/.exec(raw);
  if (!m) return { ok: false };
  const ext = m[2] ? String(m[2]) : null;
  return { ok: true, ext };
}

/**
 * 以“从左到右”的顺序，把输入占位符逐个替换为对应的文件路径。
 *
 * 规则：
 * - 输入占位符："$FFMEPG_INPUT" 或 "$FFMPEG_INPUT"
 * - 支持占位符出现在任意 argv 参数字符串内部（同一个参数中可出现多次）
 * - 替换顺序按 argv 扫描顺序进行，占位符出现一次消耗一个 artifacts 条目
 *
 * @param {string[]} argv - 参数数组（会返回新数组，不修改入参）
 * @param {string[]} inputFilePaths - 与占位符一一对应的输入文件路径（按顺序）
 * @returns {{ok:true, argv:string[]} | {ok:false, error:string, message:string}}
 */
function replaceInputPlaceholders(argv, inputFilePaths) {
  const placeholders = ["$FFMEPG_INPUT", "$FFMPEG_INPUT"];
  const out = [];
  let used = 0;

  const findNext = (text, startIndex) => {
    let best = null;
    for (const p of placeholders) {
      const idx = text.indexOf(p, startIndex);
      if (idx < 0) continue;
      if (!best || idx < best.idx) best = { idx, p };
    }
    return best;
  };

  for (const token of argv) {
    let text = String(token ?? "");
    let searchFrom = 0;
    while (true) {
      const found = findNext(text, searchFrom);
      if (!found) break;
      if (used >= inputFilePaths.length) {
        return { ok: false, error: "insufficient_artifacts", message: "输入占位符数量超过 artifacts 数组长度" };
      }
      const filePath = inputFilePaths[used++];
      text = text.slice(0, found.idx) + filePath + text.slice(found.idx + found.p.length);
      searchFrom = found.idx + String(filePath).length;
    }
    out.push(text);
  }

  if (used < inputFilePaths.length) {
    return { ok: false, error: "too_many_artifacts", message: "artifacts 数组长度超过输入占位符数量" };
  }

  return { ok: true, argv: out };
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

    const ffmpegPath = await this._resolveFfmpegPath();
    if (!ffmpegPath) {
      return fail("ffmpeg_not_found", "未找到 ffmpeg 可执行文件");
    }

    const vargs = typeof input?.vargs === "string" ? input.vargs : "";
    const parsed = parseVargsToArgv(vargs);
    if (!parsed.ok) {
      return fail(parsed.error, parsed.message);
    }

    const artifacts = normalizeStringArray(input?.artifacts);
    if (!artifacts) {
      return fail("invalid_parameter", "artifacts 必须是字符串数组");
    }

    const inputFilePaths = [];
    for (const artifactIdRaw of artifacts) {
      const artifactId = String(artifactIdRaw ?? "").trim();
      if (!artifactId) return fail("invalid_parameter", "artifacts 不能包含空字符串");
      const filePath = await ctx.tools.resolveArtifactFilePath(artifactId);
      if (!filePath) return fail("input_artifact_not_found", `输入工件不存在或无法解析路径: ${artifactId}`);
      inputFilePaths.push(filePath);
    }

    const finalArgv = [...parsed.argv];

    let outputIndex = -1;
    let outputExt = null;
    for (let i = 0; i < finalArgv.length; i++) {
      const parsedOutput = parseOutputPlaceholderToken(finalArgv[i]);
      if (!parsedOutput.ok) continue;
      if (outputIndex >= 0) {
        return fail("multiple_output_placeholders", "vargs 中只能出现一个输出占位符 $FFMEPG_OUTPUT");
      }
      outputIndex = i;
      outputExt = parsedOutput.ext;
    }

    if (outputIndex < 0) {
      return fail("missing_output_placeholder", "vargs 必须包含输出占位符 $FFMEPG_OUTPUT");
    }

    const outputName = `ffmpeg-output${outputExt || ".bin"}`;
    const reservedOutput = await ctx.tools.reserveArtifactFile({
      name: outputName,
      type: null,
      messageId,
      createdByAgentId,
      meta: {
        module: "ffmpeg",
        taskId,
        role: "ffmpeg_output"
      }
    });

    if (!reservedOutput?.artifactId || !reservedOutput?.filePath) {
      return fail("reserve_output_failed", "预留输出工件失败");
    }

    task.outputArtifactIds.push(reservedOutput.artifactId);
    task.outputFiles.push({
      artifactId: reservedOutput.artifactId,
      filePath: reservedOutput.filePath,
      name: outputName,
      type: null
    });
    finalArgv[outputIndex] = reservedOutput.filePath;

    const replaced = replaceInputPlaceholders(finalArgv, inputFilePaths);
    if (!replaced.ok) {
      return fail(replaced.error, replaced.message);
    }
    for (let i = 0; i < finalArgv.length; i++) finalArgv[i] = replaced.argv[i];

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
