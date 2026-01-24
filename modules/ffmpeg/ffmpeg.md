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

