## 目标
- 新增 modules/ffmpeg 模块：提供 ffmpeg 命令执行与任务进度查询。
- 文件参数不接收真实路径：输入文件使用工件ID（字符串），执行前通过工件管理器解析真实文件路径。
- 输出文件直接写入工件目录：ffmpeg_run 立即返回“输出工件ID（字符串）+ taskId”；工件在任务完成前可能是不完整/不可用的。
- 提供管理界面：参考 ssh/chrome 的模块面板模式，能创建任务、查看任务列表、查看输出工件ID与状态。

## 关键现状（与实现相关）
- 工件ID是字符串（当前生成器为类 UUID 格式），不是数字（参考 [id_generator.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/artifact/id_generator.js#L31-L83)）。
- ctx 里存在 currentMessage.id 与 agent.id，可用于记录“哪条聊天触发/哪个智能体触发”（参考 [tool_executor.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/tool_executor.js#L706-L723)）。

## 平台层补齐（用于“直接写入工件并立即得到ID”）
需要在 ArtifactStore 增加两个异步能力，并注入到 ctx.tools：
- resolveArtifactFilePath(ref: string): Promise<string|null>
  - 输入：工件ID（普通/工作区）
  - 输出：真实文件路径（用于 ffmpeg 的输入路径）
- reserveArtifactFile(input): Promise<{artifactId:string, filePath:string}>
  - input 字段（包含你要求的归属信息）：
    - name: string（展示名/期望文件名，例如 out.mp4，用于推导扩展名）
    - type?: string（可选 MIME）
    - messageId?: string（哪条聊天记录触发）
    - createdByAgentId?: string（哪个智能体触发）
    - meta?: object（可选，例如 taskId、模块名、原始 argv 等）
  - 行为：生成 artifactId，写入 .meta，返回该工件对应的真实文件路径（artifactsDir/\u003cid\u003e\u003cext\u003e）。
  - 重要语义：此时工件内容可能尚未写完；必须以任务查询 completed 为准。

## ffmpeg_run 参数设计（保证“复杂参数表”可透传）
不对 ffmpeg 的参数表做结构化建模，核心是“原样透传 argv + 单独声明哪些位置/哪些字符串片段是文件”。
- 工具：ffmpeg_run
- 入参：
  - argv: string[]（完整的 ffmpeg 参数数组，不包含程序名；完全透传，支持任意复杂组合）
  - inputs?: Array<{ index:number, artifactId:string }>
    - 表示 argv[index] 是输入文件位置；模块用 resolveArtifactFilePath(artifactId) 得到真实路径并替换 argv[index]
  - outputs?: Array<{ index:number, name:string, type?:string }>
    - 表示 argv[index] 是输出文件位置；模块用 reserveArtifactFile({name,type,messageId,createdByAgentId,meta}) 得到 {artifactId,filePath} 并替换 argv[index]=filePath
  - replacements?: Array<{ index:number, placeholder:string, artifactId:string }>
    - 用于处理“文件路径嵌在一个参数字符串里”的场景（例如滤镜参数）；在 argv[index] 内把 placeholder 替换为解析后的真实路径
- 返回：
  - taskId
  - outputArtifactIds: string[]
  - artifactIds: string[]（同 outputArtifactIds，保证聊天立即显示生成的工件ID）
- 工具提示词（必须写清楚）：
  - ffmpeg_run 返回的 outputArtifactIds 在 ffmpeg_task_status 显示 completed 之前可能是不完整工件；不要在任务完成前把这些工件当作最终结果使用。

## 任务查询
- 工具：ffmpeg_task_status
- 入参：{ taskId }
- 返回：
  - status: pending|running|completed|failed|cancelled
  - progress: { ratio?:number, raw?:object, lastStderrLines?:string[] }
  - exitCode?: number
  - error?: string
  - outputArtifactIds?: string[]（与 run 时一致）
  - logArtifactIds?: string[]（stdout/stderr 日志工件；写入时同样带 messageId 与 createdByAgentId）
  - artifactIds?: string[]（合并 output+log）

## 进度实现（不扩大需求）
- 基础：status + 最近 stderr 行。
- ratio：仅在 argv 可推导总时长（如 -t/-to）时计算，否则不返回 ratio。

## FFmpeg 可执行文件来源
- 策略：优先 ffmpeg-static（若安装），否则使用系统 PATH 的 ffmpeg。

## 管理界面（模块面板）
- 新增 modules/ffmpeg/web/panel.html|panel.js|panel.css，参考 ssh/web。
- 功能：
  - 新建任务：输入 argv（JSON 数组或按空格/换行拆分），输入 inputs/outputs/replacements（JSON）
  - 任务列表：taskId、状态、进度片段、输出工件ID（链接）
  - 明确提示：running 状态下输出工件可能不完整；completed 后才可使用
- 模块 HTTP API：
  - GET /api/modules/ffmpeg/overview
  - POST /api/modules/ffmpeg/tasks
  - GET /api/modules/ffmpeg/tasks/:taskId

## 文件结构（落地后会生成/修改）
- 新增 modules/ffmpeg/（index.js/tools.js/ffmpeg_manager.js/ffmpeg.md + web 面板文件）
- 修改 ArtifactStore 与 ContextBuilder：注入 resolveArtifactFilePath/reserveArtifactFile

## 测试与验证（不启动项目）
- 新增 test/modules/ffmpeg.test.js：覆盖 run/status、输出工件ID立即返回、完成后状态更新。
- 新增/补充 artifact 相关测试：覆盖 reserveArtifactFile 写 meta（含 messageId/createdByAgentId）与 resolveArtifactFilePath。
- 运行 bun test 验证通过。

确认后我将按此方案开始实现与补测试。