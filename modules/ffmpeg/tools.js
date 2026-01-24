export function getToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "ffmpeg_run",
        description:
          "执行 ffmpeg 命令（异步）。返回 taskId 和输出工件ID。注意：在 ffmpeg_task_status 显示 completed 之前，这些输出工件可能是不完整的，不要在任务完成前把它们当作最终结果使用。",
        parameters: {
          type: "object",
          properties: {
            argv: {
              type: "array",
              description: "ffmpeg 参数数组（不包含程序名），完全透传",
              items: { type: "string" }
            },
            inputs: {
              type: "array",
              description: "声明 argv 中哪些位置是输入文件（通过工件ID解析为真实路径替换）",
              items: {
                type: "object",
                properties: {
                  index: { type: "number", description: "argv 下标（从 0 开始）" },
                  artifactId: { type: "string", description: "输入工件ID（字符串）" }
                },
                required: ["index", "artifactId"]
              }
            },
            outputs: {
              type: "array",
              description:
                "声明 argv 中哪些位置是输出文件（将被替换为工件真实路径，并返回对应的输出工件ID）",
              items: {
                type: "object",
                properties: {
                  index: { type: "number", description: "argv 下标（从 0 开始）" },
                  name: { type: "string", description: "输出文件名（用于推导扩展名，例如 out.mp4）" },
                  type: { type: "string", description: "可选 MIME 类型（用于推导扩展名）" }
                },
                required: ["index", "name"]
              }
            },
            replacements: {
              type: "array",
              description:
                "用于处理“文件路径嵌在一个参数字符串里”的场景：在 argv[index] 内把 placeholder 替换为真实路径",
              items: {
                type: "object",
                properties: {
                  index: { type: "number", description: "argv 下标（从 0 开始）" },
                  placeholder: { type: "string", description: "要被替换的占位符字符串" },
                  artifactId: { type: "string", description: "输入工件ID（字符串）" }
                },
                required: ["index", "placeholder", "artifactId"]
              }
            }
          },
          required: ["argv"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "ffmpeg_task_status",
        description: "查询 ffmpeg 异步任务状态与进度。completed 时输出工件才可视为完整结果。",
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

