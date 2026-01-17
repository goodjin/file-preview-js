# js

## 综述
该目录存放 Web UI 的脚本文件。

脚本以传统 <script> 方式加载（非 ES Module），主要通过 window.* 方式暴露全局对象。页面加载顺序由 web/index.html 决定：先加载 utils/，再加载 api.js，随后加载 components/ 下的各组件脚本，最后加载 app.js 完成应用初始化。

该目录包含 3 个文件与 2 个子目录。

## 文件列表
- api.js: 功能：后端 HTTP API 封装。责任：统一管理 Web UI 对后端的请求与错误传播，并对常用业务端点提供方法封装。内部结构：定义 API 对象；提供通用 get/post/delete；封装 agents/roles/messages/org tree/config/modules/upload/events 等端点；末尾将 API 赋值到 window.API。
- app.js: 功能：主应用控制器。责任：管理视图切换、全局状态、轮询刷新、与组件之间的协调。内部结构：定义 App 对象；init 负责初始化组件、绑定按钮事件、加载初始数据与启动轮询；包含智能体选择、消息加载与追加、退避轮询、错误与重试事件展示等逻辑；末尾将 App 赋值到 window.App。
- js.md: 功能：本目录说明文档。责任：描述本目录的综述、文件列表与子目录列表。内部结构：包含“综述 / 文件列表 / 子目录列表”。

## 子目录列表
- components: 功能：界面组件脚本。责任：提供弹窗、列表、对话面板、工件与附件管理等 UI 组件，实现具体交互。内部结构：以 window.* 暴露组件对象或以 class 声明暴露构造器，并包含目录说明文档。（详见 components/components.md）
- utils: 功能：通用工具脚本。责任：提供排序、筛选、树构建、上传与图片转换等工具能力，供 app.js 与组件复用。内部结构：以工具函数对象为主，并包含目录说明文档。（详见 utils/utils.md）
