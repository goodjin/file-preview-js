# FFmpeg 模块

## 模块概述
FFmpeg 模块为系统提供音视频处理命令执行能力。工具以异步任务方式运行，调用方通过 taskId 查询进度与结果。

## 核心功能
- 执行 FFmpeg 命令（异步）：返回 taskId 与输出工件ID
- 查询任务状态：返回运行状态、进度片段、输出工件ID、日志工件ID
- 管理界面：创建任务与查看任务列表

## 工件与异步约束
- 输出文件直接写入工件目录，因此 ffmpeg_run 会立即返回输出工件ID。
- 在 ffmpeg_task_status 显示 completed 之前，输出工件可能是不完整的，不应当作为最终结果使用。

## 工具列表
- ffmpeg_run
- ffmpeg_task_status

## ffmpeg_run 调用参数与占位符规则
- 参数：`vargs`（字符串）与 `artifacts`（字符串数组）
- vargs：不包含程序名的完整参数字符串，会被解析为 argv 并调用 ffmpeg
- 输入占位符：`$FFMEPG_INPUT`（或 `$FFMPEG_INPUT`），按出现顺序逐个替换为 `artifacts` 中对应工件的真实文件路径
- 输出占位符：`$FFMEPG_OUTPUT`（或 `$FFMPEG_OUTPUT`），用于替代输出文件路径；输出文件路径由工具内部预留的新工件文件路径提供，并通过 `outputArtifactIds` 返回
- 扩展名：可写为 `$FFMEPG_OUTPUT.mp4` 以指定输出工件扩展名（支持多段扩展名，如 `.tar.gz`）

## 目录结构
```
modules/ffmpeg/
├── index.js
├── tools.js
├── ffmpeg_manager.js
├── ffmpeg.md
└── web/
    ├── panel.html
    ├── panel.js
    └── panel.css
```
