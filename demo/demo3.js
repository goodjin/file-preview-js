import readline from "node:readline";
import { AgentSociety } from "../src/platform/core/agent_society.js";

const helpText = [
  "═══════════════════════════════════════════════════════════════════",
  "  🍜 虚拟饭店经营模拟游戏 - Demo3",
  "═══════════════════════════════════════════════════════════════════",
  "",
  "游戏背景：",
  "  你是一位顾客，来到一家由AI经营的虚拟饭店。",
  "  饭店经理在有限的预算下组建团队、采购物料、经营饭店。",
  "  经理的目标是：接待顾客、赚取利润、避免破产、争取扩张。",
  "",
  "本地指令：",
  "  help     - 显示帮助",
  "  exit     - 退出游戏",
  "  target   - 查看当前对话目标",
  "  use <id> - 切换对话目标（如：use manager-xxx）",
  "  to <id> <文本> - 向指定智能体发送消息",
  "",
  "顾客常用语（直接输入即可）：",
  "  你好 / 有人吗      - 打招呼",
  "  看看菜单 / 菜单    - 查看菜单",
  "  点菜 / 我要点餐    - 开始点餐",
  "  结账 / 买单        - 结账付款",
  "  投诉 / 找经理      - 联系经理",
  "",
  "═══════════════════════════════════════════════════════════════════",
].join("\n");

/**
 * 构建饭店模拟游戏的需求描述
 * Root 只创建游戏规则智能体，游戏规则智能体负责创建经理，经理负责组建团队
 */
function buildRestaurantGameRequirement() {
  return `
【任务目标】
创建一个"虚拟饭店经营模拟游戏"的游戏规则智能体。

【你的职责 - 游戏规则智能体】
你是这个模拟游戏的"游戏规则"智能体，负责：
1. 制定并执行游戏规则（经济系统、时间流逝、成本计算等）
2. 创建饭店经理智能体，给予初始预算
3. 监督游戏进程，确保规则被遵守
4. 处理用户与经理/员工的交互路由

【游戏规则设定】
1. 初始资金：经理获得 50000 元启动资金
2. 固定成本（每轮/每天）：
   - 房租：500 元/天
   - 水电：100 元/天
3. 人员工资（每天）：
   - 经理：200 元/天（由系统支付，不计入经理预算）
   - 服务员：80 元/天
   - 厨师：120 元/天
   - 收银员：80 元/天
4. 物料成本：
   - 每道菜的食材成本约为售价的 30-40%
5. 收入来源：
   - 顾客点餐付款
6. 破产条件：
   - 资金降至 0 以下
7. 扩张条件：
   - 资金超过 100000 元可考虑扩张

【经理的职责（写入经理岗位提示词，非常重要！）】
经理岗位提示词必须包含以下关键说明：
1. 在预算内组建团队（至少需要：1名服务员、1名厨师）
2. 设计菜单（至少6道菜，包含菜品ID、名称、价格、成本）
3. 管理库存（食材采购、库存扣减）
4. 接待顾客或指派员工接待
5. 财务管理（收入、支出、利润计算）
6. 决策是否招聘/解雇员工
7. 努力经营，避免破产，争取扩张

【创建员工团队】
经理需要先用 create_role 创建子岗位（如"服务员"、"厨师"），然后用 spawn_agent_with_task 在岗位上创建智能体实例。
根据业务需要，同一岗位可以有多个智能体（如：生意好时多招几个服务员）。

【交互规则】
1. 用户以顾客身份参与，所有用户消息都应路由到接待岗位（服务员或经理指定的人）
2. 顾客可以：看菜单、点餐、结账、投诉、找经理
3. 所有对用户的输出必须通过 send_message(to=user, payload.text=纯文本)
4. 经理可以指定谁负责接待顾客（默认是服务员，没有服务员时经理亲自接待）

【启动流程】
1. 创建"饭店经理"岗位，写入详细的经营职责、游戏规则、以及创建子智能体的正确流程
2. 创建经理智能体实例
3. 发送初始化消息给经理，包含：初始资金、游戏规则、启动指令
4. 经理收到后自行组建团队（先 create_role 再 spawn_agent）、设计菜单、准备开业
5. 准备就绪后，通知用户饭店已开业，可以开始点餐

【重要约束】
- 所有金额计算必须使用 run_javascript 工具，确保精确
- 每次交易后更新并汇报财务状态
- 游戏过程要尽可能模拟真实饭店运营
- 保持沉浸感，用自然语言与顾客交流
- 数据持久化：使用 put_artifact 保存游戏状态（资金、库存、订单等）
`.trim();
}

/**
 * 等待任务入口智能体ID
 */
async function waitForTaskEntryAgentId(system, taskId) {
  const msg = await system.waitForUserMessage(
    (m) => m?.taskId === taskId && m?.from === "root" && m?.payload?.agentId,
    { timeoutMs: 120_000_000 }
  );
  return msg?.payload?.agentId ? String(msg.payload.agentId) : null;
}

/**
 * 等待饭店准备就绪的消息
 */
async function waitForRestaurantReady(system, taskId) {
  return await system.waitForUserMessage(
    (m) => {
      if (m?.taskId !== taskId) return false;
      const text = String(m?.payload?.text ?? "").toLowerCase();
      return text.includes("开业") || text.includes("欢迎") || text.includes("准备") || text.includes("就绪");
    },
    { timeoutMs: 300_000_000 }
  );
}

function makeReadline() {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout, 
    terminal: true 
  });
  const question = (q) => new Promise((resolve) => rl.question(q, (a) => resolve(String(a ?? ""))));
  return { rl, question };
}

async function main() {
  console.log("\n🍜 正在启动虚拟饭店经营模拟游戏...\n");
  
  // 使用自定义数据目录，增加工具调用轮次限制（复杂自组织场景需要更多轮次）
  // 使用自定义数据目录
  const system = new AgentSociety({ dataDir: "data/demo3" });
  await system.init();

  // 提交游戏需求
  const { taskId } = await system.submitRequirement(buildRestaurantGameRequirement());
  console.log(`📋 任务已提交 taskId=${taskId}`);
  console.log("⏳ 正在创建游戏规则智能体...\n");

  // 等待入口智能体创建完成
  const entryAgentId = await waitForTaskEntryAgentId(system, taskId);
  if (!entryAgentId) {
    console.log("❌ 未能获取游戏入口智能体ID，请检查系统日志。");
    return;
  }
  console.log(`✅ 游戏规则智能体已创建: ${entryAgentId}`);
  console.log("⏳ 饭店正在筹备中，请稍候...\n");

  // 等待饭店准备就绪（可选，超时后也可以开始交互）
  const readyMsg = await waitForRestaurantReady(system, taskId);
  if (readyMsg) {
    console.log("🎉 饭店已准备就绪！\n");
  } else {
    console.log("⚠️ 等待超时，但您仍可以尝试与饭店交互。\n");
  }

  // 显示帮助信息
  console.log(helpText);
  console.log(`\n📍 当前 taskId: ${taskId}`);
  console.log(`📍 默认对话目标: ${entryAgentId}\n`);

  const { rl, question } = makeReadline();
  rl.on("SIGINT", () => {
    console.log("\n👋 感谢光临，再见！");
    rl.close();
    process.exit(0);
  });

  let defaultTarget = entryAgentId;

  // 主交互循环
  while (true) {
    const input = (await question("顾客> ")).trim();
    if (!input) continue;

    const parts = input.split(/\s+/g);
    const cmd = parts[0]?.toLowerCase();

    // 本地指令处理
    if (cmd === "exit" || cmd === "quit" || cmd === "退出") {
      system.sendTextToAgent(defaultTarget, "顾客离开了饭店", { taskId });
      console.log("\n👋 感谢光临，再见！");
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

    // 发送顾客消息到默认目标
    system.sendTextToAgent(defaultTarget, input, { taskId });
  }
}

await main();
