import readline from "node:readline";
import { AgentSociety } from "../src/platform/agent_society.js";

/**
 * 架构师岗位提示词模板
 * Requirements: 6.3, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */
const ARCHITECT_ROLE_PROMPT = `
你是一名软件架构师，负责：
1. 与用户沟通需求，澄清不明确的地方
2. 设计系统架构，确保模块化、高内聚低耦合
3. 将系统分解为子模块，每个模块代码量控制在500行以内
4. 为每个模块创建程序员智能体，分配开发任务
5. 收集模块代码，进行集成和交付

【模块分解原则】
- 每个模块只负责单一职责
- 模块之间通过清晰的接口通信
- 每个模块的代码不超过500行
- 如果模块过于复杂（预估超过2000行），创建子架构师进一步分解

【程序员管理 - 必须使用 Task_Brief】
- 为每个模块创建一个程序员岗位和智能体（一模块一程序员）
- 创建程序员时必须提供完整的 Task_Brief（任务委托书），包含以下必填字段：
  - objective: 目标描述（清晰说明模块要实现什么功能）
  - constraints: 技术约束数组（重要！必须明确指定技术栈，如"使用HTML+JavaScript"、"静态网页，不需要后端"、"使用Python"等）
  - inputs: 输入说明（模块接收什么数据或参数）
  - outputs: 输出要求（模块产出什么结果）
  - completion_criteria: 完成标准（如何判断任务完成）
- 可选字段：
  - collaborators: 预设协作联系人（如果程序员需要与其他智能体协作）
  - references: 参考资料
  - priority: 优先级

【技术约束传递 - 极其重要！】
- 用户提出的技术要求（如"静态网页"、"Python"、"不需要后端"等）必须写入 Task_Brief 的 constraints 字段
- 不要假设程序员知道这些约束，必须明确传递
- 示例：如果用户要求"静态网页计算器"，constraints 应包含：
  - "使用 HTML + JavaScript 实现"
  - "必须是静态网页，不需要后端服务器"
  - "所有逻辑在浏览器端运行"

【spawn_agent 调用示例】
spawn_agent(roleId="programmer-xxx", taskBrief={
  objective: "实现计算器的核心运算模块",
  constraints: ["使用 JavaScript 实现", "纯前端代码，无后端依赖", "支持四则运算"],
  inputs: "两个数字和一个运算符",
  outputs: "运算结果",
  completion_criteria: "所有四则运算测试通过，代码可在浏览器中运行"
})

【程序员任务分配】
- 收到程序员完成汇报后，检查代码质量
- 任务完成后调用 terminate_agent 终止程序员智能体

【文件操作】
- 使用 list_files 查看工作空间结构
- 使用 read_file 读取现有代码
- 使用 write_file 创建架构文档和模块规格说明
- 使用 run_command 执行测试和构建命令

【进度汇报】
- 架构设计完成后向用户汇报方案并征求确认
- 模块开发完成后向用户汇报进度
- 集成完成后向用户交付成果
- 遇到阻塞问题时及时向用户说明并寻求指导

【与用户沟通 - 重要！】
- 需要向用户反馈时：send_message(to="user", payload={text: "..."})
- 发送消息给用户后，必须立即调用 wait_for_message 等待用户回复
- 正确流程：
  1. send_message(to="user", payload={text: "您的问题..."})
  2. wait_for_message()  ← 必须调用！否则无法收到用户回复
- 需要澄清需求时：发送问题后调用 wait_for_message 等待用户回答
- 切勿在同一轮对话中重复发送相同的问题

【层级化分解】
- 如果某个模块预估超过2000行代码，创建子架构师岗位
- 子架构师负责将大模块进一步分解为更小的子模块
- 子架构师完成任务后，调用 terminate_agent 终止

【工件管理】
- 使用 put_artifact 保存架构设计文档
- 使用 put_artifact 保存模块规格说明
- 使用 put_artifact 保存集成计划
- 集成完成后将完整系统打包为工件交付给用户
`.trim();

/**
 * 程序员岗位提示词模板
 * Requirements: 6.4, 8.6
 */
const PROGRAMMER_ROLE_PROMPT = `
你是一名程序员，负责开发分配给你的模块。

【重要！查看你的任务委托书（Task_Brief）】
- 你的任务详情在创建时已通过 Task_Brief 注入到你的上下文中
- Task_Brief 包含：
  - objective: 你需要实现的目标
  - constraints: 技术约束（必须严格遵守！如"使用HTML+JavaScript"、"静态网页"等）
  - inputs: 输入说明
  - outputs: 输出要求
  - completion_criteria: 完成标准
- 开始工作前，仔细阅读 Task_Brief 中的所有约束条件
- 技术选型必须符合 constraints 中的要求，不要自行决定使用其他技术

【重要！你是最终执行者】
- 你必须亲自编写代码，不能创建子智能体或委托任务
- 禁止使用 create_role 或 spawn_agent 工具
- 直接使用 write_file 工具将代码写入工作空间

【开发规范】
- 严格按照 Task_Brief 中的 constraints 进行开发
- 确保代码符合接口定义
- 单个代码文件不超过500行
- 添加必要的注释，说明模块职责和接口用法

【请求协作支持 - 介绍式通信】
- 如果你需要其他智能体的帮助（如UI设计、测试等），但不知道联系谁：
  1. 向你的父智能体（架构师）发送介绍请求
  2. 消息格式：send_message(to="<父智能体ID>", payload={
       message_type: "introduction_request",
       reason: "需要协作的原因",
       required_capability: "所需能力描述"
     })
  3. 等待父智能体回复介绍信息
  4. 收到介绍后，你就可以直接联系被介绍的智能体
- 如果 Task_Brief 中已包含 collaborators，你可以直接联系这些预设的协作者

【文件操作 - 必须使用这些工具写代码】
- 使用 write_file 创建代码文件（这是你的主要工作！）
- 使用 read_file 查看相关文件和依赖模块
- 使用 list_files 了解项目结构
- 使用 run_command 执行测试

【正确的工作流程】
1. 收到任务后，首先仔细阅读 Task_Brief 中的约束条件
2. 根据 constraints 选择正确的技术栈
3. 使用 write_file 将代码写入文件（如：write_file(path="calculator.html", content="...")）
4. 代码完成后，使用 run_command 测试
5. 向架构师汇报完成情况
6. 调用 wait_for_message 等待下一步指示

【质量要求】
- 代码完成后进行自测
- 如果模块逻辑复杂需要超过500行，向架构师申请进一步拆分
- 确保代码可读性和可维护性

【汇报规范】
- 开发完成后向架构师汇报
- 汇报内容包括：
  - 完成的文件列表
  - 测试结果
  - 遇到的问题（如有）
- 使用 put_artifact 将代码文件保存为工件
- 汇报后调用 wait_for_message 等待下一步指示
`.trim();


/**
 * 构建编程团队需求描述
 * 将用户需求包装为架构师可以理解的任务格式
 * @param {string} userRequirement - 用户的编程需求
 * @returns {string} 完整的需求描述
 */
function buildDevTeamRequirement(userRequirement) {
  return `
【任务目标】
创建一个软件架构师智能体来处理以下编程需求：

${userRequirement}

【架构师职责】
${ARCHITECT_ROLE_PROMPT}

【程序员岗位模板】
当创建程序员岗位时，使用以下提示词：
${PROGRAMMER_ROLE_PROMPT}
  `.trim();
}

const helpText = [
  "═══════════════════════════════════════════════════════════════════",
  "  🏗️  自组织编程团队 - Dev Team Demo",
  "═══════════════════════════════════════════════════════════════════",
  "",
  "功能说明：",
  "  架构师智能体将分析您的需求，设计系统架构，",
  "  创建程序员智能体进行模块开发，最终集成交付。",
  "",
  "本地指令：",
  "  help     - 显示帮助",
  "  exit     - 退出程序",
  "  target   - 查看当前对话目标",
  "  use <id> - 切换对话目标（如：use architect-xxx）",
  "  to <id> <文本> - 向指定智能体发送消息",
  "  files    - 列出工作空间文件",
  "",
  "与架构师沟通（直接输入即可）：",
  "  描述您的需求、确认架构方案、询问进度等",
  "",
  "═══════════════════════════════════════════════════════════════════",
].join("\n");

/**
 * 等待任务入口智能体ID（架构师）
 * @param {AgentSociety} system
 * @param {string} taskId
 * @returns {Promise<string|null>}
 */
async function waitForTaskEntryAgentId(system, taskId) {
  const msg = await system.waitForUserMessage(
    (m) => m?.taskId === taskId && m?.from === "root" && m?.payload?.agentId,
    { timeoutMs: 120_000_000 }
  );
  return msg?.payload?.agentId ? String(msg.payload.agentId) : null;
}

/**
 * 等待架构师准备就绪的消息
 * @param {AgentSociety} system
 * @param {string} taskId
 * @returns {Promise<any>}
 */
async function waitForArchitectReady(system, taskId) {
  return await system.waitForUserMessage(
    (m) => {
      if (m?.taskId !== taskId) return false;
      const text = String(m?.payload?.text ?? "").toLowerCase();
      return text.includes("架构") || text.includes("设计") || 
             text.includes("需求") || text.includes("开始") ||
             text.includes("准备");
    },
    { timeoutMs: 300_000_000 }
  );
}

/**
 * 创建 readline 接口
 * @returns {{rl: readline.Interface, question: (q: string) => Promise<string>}}
 */
function makeReadline() {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout, 
    terminal: true 
  });
  const question = (q) => new Promise((resolve) => rl.question(q, (a) => resolve(String(a ?? ""))));
  return { rl, question };
}


/**
 * 解析命令行参数
 * @returns {{workspacePath: string, userRequirement: string}}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let workspacePath = "./workspace";
  let userRequirement = "";
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--workspace" || arg === "-w") {
      workspacePath = args[++i] || workspacePath;
    } else if (arg === "--requirement" || arg === "-r") {
      userRequirement = args[++i] || "";
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
用法: node demo/dev_team.js [选项]

选项:
  -w, --workspace <path>     工作空间路径 (默认: ./workspace)
  -r, --requirement <text>   编程需求描述
  -h, --help                 显示帮助信息

示例:
  bun demo/dev_team.js -w ./my_project/wuziqi "写一个html的五子棋游戏，双人对战的，具有输赢判断的逻辑，可以重启。注重暖色颜色的设计和游戏感的用户体验。"
  node demo/dev_team.js -w ./my_project/calculator -r "创建一个简单的计算器程序。静态网页，支持加减乘除运算，满足普通计算器要求。"
  node demo/dev_team.js --workspace ./my_project/todolist --requirement "实现一个待办事项管理系统"
`);
      process.exit(0);
    } else if (!userRequirement && !arg.startsWith("-")) {
      // 兼容旧的位置参数格式
      if (!workspacePath || workspacePath === "./workspace") {
        workspacePath = arg;
      } else {
        userRequirement = arg;
      }
    }
  }
  
  return { workspacePath, userRequirement };
}

/**
 * 主函数
 * Requirements: 1.1, 1.2
 */
async function main() {
  console.log("\n🏗️  正在启动自组织编程团队...\n");
  
  // 解析命令行参数
  const { workspacePath, userRequirement: initialRequirement } = parseArgs();
  
  // 初始化 AgentSociety
  const system = new AgentSociety({ dataDir: "data/dev_team" });
  await system.init();
  
  const { rl, question } = makeReadline();
  
  // 如果没有通过命令行提供需求，交互式获取
  let userRequirement = initialRequirement;
  if (!userRequirement) {
    console.log("请描述您的编程需求（输入完成后按回车）：");
    userRequirement = await question("需求> ");
    if (!userRequirement.trim()) {
      userRequirement = "创建一个简单的计算器程序，支持加减乘除运算";
      console.log(`\n使用默认需求: ${userRequirement}\n`);
    }
  }
  
  console.log(`\n📁 工作空间: ${workspacePath}`);
  console.log(`📋 需求: ${userRequirement}\n`);
  
  // 提交需求并绑定工作空间
  const result = await system.submitRequirement(
    buildDevTeamRequirement(userRequirement),
    { workspacePath }
  );
  
  if (result.error) {
    console.log(`❌ 提交需求失败: ${result.error}`);
    rl.close();
    return;
  }
  
  const { taskId } = result;
  console.log(`📋 任务已提交 taskId=${taskId}`);
  console.log("⏳ 正在创建架构师智能体...\n");
  
  // 等待入口智能体（架构师）创建完成
  const entryAgentId = await waitForTaskEntryAgentId(system, taskId);
  if (!entryAgentId) {
    console.log("❌ 未能获取架构师智能体ID，请检查系统日志。");
    rl.close();
    return;
  }
  console.log(`✅ 架构师智能体已创建: ${entryAgentId}`);
  console.log("⏳ 架构师正在分析需求...\n");
  
  // 等待架构师准备就绪
  const readyMsg = await waitForArchitectReady(system, taskId);
  if (readyMsg) {
    console.log("🎉 架构师已准备就绪！\n");
  } else {
    console.log("⚠️ 等待超时，但您仍可以尝试与架构师交互。\n");
  }
  
  // 显示帮助信息
  console.log(helpText);
  console.log(`\n📍 当前 taskId: ${taskId}`);
  console.log(`📍 工作空间: ${workspacePath}`);
  console.log(`📍 默认对话目标: ${entryAgentId}\n`);
  
  rl.on("SIGINT", () => {
    console.log("\n👋 感谢使用，再见！");
    rl.close();
    process.exit(0);
  });
  
  let defaultTarget = entryAgentId;
  
  // 主交互循环
  while (true) {
    const input = (await question("用户> ")).trim();
    if (!input) continue;
    
    const parts = input.split(/\s+/g);
    const cmd = parts[0]?.toLowerCase();
    
    // 本地指令处理
    if (cmd === "exit" || cmd === "quit" || cmd === "退出") {
      system.sendTextToAgent(defaultTarget, "用户结束了会话", { taskId });
      console.log("\n👋 感谢使用，再见！");
      rl.close();
      return;
    }
    
    if (cmd === "help" || cmd === "帮助") {
      console.log(helpText);
      continue;
    }
    
    if (cmd === "target" || cmd === "目标") {
      console.log(`📍 当前对话目标: ${defaultTarget}`);
      continue;
    }
    
    if (cmd === "use" || cmd === "切换") {
      const id = String(parts[1] ?? "").trim();
      if (!id) {
        console.log("用法: use <agentId> 或 切换 <agentId>");
        continue;
      }
      defaultTarget = id;
      console.log(`📍 已切换对话目标: ${defaultTarget}`);
      continue;
    }
    
    if (cmd === "to" || cmd === "发送") {
      const id = String(parts[1] ?? "").trim();
      const text = parts.slice(2).join(" ").trim();
      if (!id || !text) {
        console.log("用法: to <agentId> <消息> 或 发送 <agentId> <消息>");
        continue;
      }
      system.sendTextToAgent(id, text, { taskId });
      continue;
    }
    
    if (cmd === "files" || cmd === "文件") {
      console.log(`📁 工作空间: ${workspacePath}`);
      console.log("提示: 架构师和程序员会在此目录下创建代码文件");
      continue;
    }
    
    // 发送用户消息到默认目标（架构师）
    system.sendTextToAgent(defaultTarget, input, { taskId });
  }
}

await main();
