export function getToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "ffmpeg_run",
        description:
          "执行 ffmpeg 命令（异步）。需要 2 个参数：vargs 与 artifacts。vargs 是不包含程序名的完整参数字符串，会被解析为 argv 并用于调用 ffmpeg；artifacts 是按顺序替换输入占位符的工件ID数组。占位符规则：1) 输入占位符为 $FFMEPG_INPUT（或 $FFMPEG_INPUT），从左到右逐个替换为 artifacts 对应工件的真实文件路径；2) 输出占位符为 $FFMEPG_OUTPUT（或 $FFMPEG_OUTPUT），用于替代输出文件路径，该输出文件路径由函数内部预留的新工件文件路径提供，并返回 outputArtifactIds。可写为 $FFMEPG_OUTPUT.mp4 以指定输出工件扩展名。注意：在 ffmpeg_task_status 显示 completed 之前，输出工件可能不完整，不应当作为最终结果使用。若启动前参数校验失败，也会返回 taskId 且 status=failed，需通过 ffmpeg_task_status 查看失败详情。",
        parameters: {
          type: "object",
          properties: {
            vargs: {
              type: "string",
              description:
                "不包含程序名的完整参数字符串（例如：-i $FFMEPG_INPUT -c copy $FFMEPG_OUTPUT.mp4）。会被解析为 argv 后调用 ffmpeg。"
            },
            artifacts: {
              type: "array",
              description:
                "用于替换输入占位符的工件ID数组，按占位符出现顺序消耗。占位符为 $FFMEPG_INPUT（或 $FFMPEG_INPUT）。",
              items: { type: "string" }
            }
          },
          required: ["vargs", "artifacts"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "ffmpeg_task_status",
        description: "查询 ffmpeg 异步任务状态与进度。completed 时输出工件才可视为完整结果；failed 时会返回 failure（包含错误码与 stderrTail）以及日志工件ID。",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "任务ID（由 ffmpeg_run 返回）" }
          },
          required: ["taskId"]
        }
      }
    }
  ];
}
