import { AgentSociety } from "../src/platform/core/agent_society.js";

/**
 * 用户视角 Demo：只提交需求给根智能体，然后等待输出。
 * @returns {Promise<void>}
 */
async function main() {
  // 使用自定义数据目录，避免与其他实例冲突
  const system = new AgentSociety({ dataDir: "data/demo1" });
  try {
    await system.init();

    const { taskId } = await system.submitRequirement(
      "https://openblock.online 的首页里有什么？"
    );

    const reply = await system.waitForUserMessage(
      (m) => m?.taskId === taskId && !(m?.from === "root" && m?.payload?.agentId),
      { timeoutMs: 6000_000 }
    );
    if (!reply) {
      console.log(`[timeout] taskId=${taskId}`);
      return;
    }
    if (reply?.payload?.text) {
      console.log(String(reply.payload.text));
      return;
    }
    console.log(JSON.stringify(reply?.payload ?? null, null, 2));
  } finally {
  }
}

await main();
