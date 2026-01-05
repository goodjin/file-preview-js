import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import path from "node:path";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { CommandExecutor } from "../../src/platform/command_executor.js";

describe("CommandExecutor", () => {
  /**
   * Property 5: 危险命令拦截
   * *For any* 包含危险关键词的命令（如 sudo、rm -rf /），run_command 应拒绝执行并返回错误
   * 
   * **Validates: Requirements 10.5**
   */
  test("Property 5: 危险命令拦截", async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成包含危险关键词的命令
        fc.oneof(
          // sudo 命令
          fc.constantFrom(
            "sudo apt-get install",
            "sudo rm -rf /",
            "sudo chmod 777 /etc",
            "SUDO apt update",
            "echo test && sudo ls"
          ),
          // rm -rf / 命令
          fc.constantFrom(
            "rm -rf /",
            "rm -rf /*",
            "RM -RF /",
            "rm    -rf   /"
          ),
          // su 命令
          fc.constantFrom(
            "su root",
            "su - admin",
            "SU root"
          ),
          // 其他危险命令
          fc.constantFrom(
            "chmod 777 /etc/passwd",
            "mkfs /dev/sda",
            "dd if=/dev/zero of=/dev/sda",
            "> /dev/sda",
            "shutdown -h now",
            "reboot",
            "init 0",
            "init 6",
            ":(){ :|:& };:"
          )
        ),
        async (dangerousCommand) => {
          const workspaceDir = path.resolve(process.cwd(), `test/.tmp/pbt_cmd_danger_${Date.now()}_${Math.random().toString(36).slice(2)}`);
          await rm(workspaceDir, { recursive: true, force: true });
          await mkdir(workspaceDir, { recursive: true });
          
          try {
            const executor = new CommandExecutor();
            
            // 验证 _checkCommandSafety 检测到危险命令
            const safetyCheck = executor._checkCommandSafety(dangerousCommand);
            expect(safetyCheck.blocked).toBe(true);
            expect(safetyCheck.reason).toBeDefined();
            
            // 验证 execute 拒绝执行危险命令
            const result = await executor.execute(workspaceDir, dangerousCommand);
            expect(result.error).toBe("command_blocked");
          } finally {
            await rm(workspaceDir, { recursive: true, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: 命令执行超时
   * *For any* 执行时间超过超时限制的命令，run_command 应在超时后终止命令并返回超时错误
   * 
   * **Validates: Requirements 10.4, 10.6**
   */
  test("Property 6: 命令执行超时", async () => {
    // 创建一个长时间运行的脚本文件
    const scriptDir = path.resolve(process.cwd(), "test/.tmp/timeout_script");
    await rm(scriptDir, { recursive: true, force: true });
    await mkdir(scriptDir, { recursive: true });
    await writeFile(path.join(scriptDir, "sleep.js"), "setTimeout(() => {}, 60000);", "utf8");
    
    try {
      await fc.assert(
        fc.asyncProperty(
          // 生成超时时间（200-500ms 之间，保持测试快速）
          fc.integer({ min: 200, max: 500 }),
          async (timeoutMs) => {
            const workspaceDir = path.resolve(process.cwd(), `test/.tmp/pbt_cmd_timeout_${Date.now()}_${Math.random().toString(36).slice(2)}`);
            await rm(workspaceDir, { recursive: true, force: true });
            await mkdir(workspaceDir, { recursive: true });
            
            try {
              const executor = new CommandExecutor({ defaultTimeoutMs: timeoutMs });
              
              // 使用脚本文件来避免引号转义问题
              const sleepCommand = `node ${path.join(scriptDir, "sleep.js")}`;
              
              const startTime = Date.now();
              const result = await executor.execute(workspaceDir, sleepCommand);
              const elapsed = Date.now() - startTime;
              
              // 验证返回超时错误
              expect(result.error).toBe("command_timeout");
              expect(result.timedOut).toBe(true);
              expect(result.timeoutMs).toBe(timeoutMs);
              
              // 验证实际执行时间接近超时时间（允许 1000ms 误差）
              expect(elapsed).toBeLessThan(timeoutMs + 1000);
            } finally {
              // 等待一小段时间让进程完全终止，避免 EBUSY 错误
              await new Promise(resolve => setTimeout(resolve, 200));
              try {
                await rm(workspaceDir, { recursive: true, force: true });
              } catch {
                // 忽略清理错误
              }
            }
          }
        ),
        { numRuns: 10 }  // 减少迭代次数，因为每次迭代都需要等待超时
      );
    } finally {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        await rm(scriptDir, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    }
  }, 30000);  // 增加测试超时时间到30秒

  /**
   * Property 7: 命令结果完整性
   * *For any* 成功执行的命令，run_command 返回的结果应包含 stdout、stderr 和 exitCode 三个字段
   * 
   * **Validates: Requirements 10.3**
   */
  test("Property 7: 命令结果完整性", async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成简单的安全命令
        fc.oneof(
          // echo 命令
          fc.string({ minLength: 0, maxLength: 50 }).filter(s => 
            !s.includes("sudo") && 
            !s.includes("rm -rf") &&
            !s.includes("`") &&
            !s.includes("$") &&
            !s.includes(";") &&
            !s.includes("&") &&
            !s.includes("|") &&
            !s.includes(">") &&
            !s.includes("<")
          ).map(s => {
            const isWindows = process.platform === "win32";
            // 转义引号
            const escaped = s.replace(/"/g, '\\"');
            return isWindows ? `echo "${escaped}"` : `echo "${escaped}"`;
          }),
          // 其他简单命令
          fc.constantFrom(
            process.platform === "win32" ? "dir" : "ls",
            process.platform === "win32" ? "echo hello" : "echo hello",
            process.platform === "win32" ? "type nul" : "true"
          )
        ),
        async (safeCommand) => {
          const workspaceDir = path.resolve(process.cwd(), `test/.tmp/pbt_cmd_result_${Date.now()}_${Math.random().toString(36).slice(2)}`);
          await rm(workspaceDir, { recursive: true, force: true });
          await mkdir(workspaceDir, { recursive: true });
          
          try {
            const executor = new CommandExecutor({ defaultTimeoutMs: 5000 });
            
            const result = await executor.execute(workspaceDir, safeCommand);
            
            // 验证结果包含所有必需字段
            expect(result.error).toBeUndefined();
            expect(typeof result.stdout).toBe("string");
            expect(typeof result.stderr).toBe("string");
            expect(typeof result.exitCode).toBe("number");
          } finally {
            await rm(workspaceDir, { recursive: true, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // 基础单元测试
  test("execute runs command in correct working directory", async () => {
    const workspaceDir = path.resolve(process.cwd(), "test/.tmp/cmd_cwd_test");
    await rm(workspaceDir, { recursive: true, force: true });
    await mkdir(workspaceDir, { recursive: true });
    
    // 创建一个测试文件
    await writeFile(path.join(workspaceDir, "test.txt"), "hello world", "utf8");
    
    try {
      const executor = new CommandExecutor();
      const isWindows = process.platform === "win32";
      const command = isWindows ? "type test.txt" : "cat test.txt";
      
      const result = await executor.execute(workspaceDir, command);
      
      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain("hello world");
      expect(result.exitCode).toBe(0);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  test("_checkCommandSafety allows safe commands", () => {
    const executor = new CommandExecutor();
    
    const safeCommands = [
      "ls -la",
      "echo hello",
      "cat file.txt",
      "npm install",
      "node index.js",
      "python script.py"
    ];
    
    for (const cmd of safeCommands) {
      const result = executor._checkCommandSafety(cmd);
      expect(result.blocked).toBe(false);
    }
  });

  test("execute returns stderr for failed commands", async () => {
    const workspaceDir = path.resolve(process.cwd(), "test/.tmp/cmd_stderr_test");
    await rm(workspaceDir, { recursive: true, force: true });
    await mkdir(workspaceDir, { recursive: true });
    
    try {
      const executor = new CommandExecutor();
      const isWindows = process.platform === "win32";
      // 尝试读取不存在的文件
      const command = isWindows ? "type nonexistent_file.txt" : "cat nonexistent_file.txt";
      
      const result = await executor.execute(workspaceDir, command);
      
      expect(result.error).toBeUndefined();
      expect(result.exitCode).not.toBe(0);
      // stderr 或 stdout 应该包含错误信息
      expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
