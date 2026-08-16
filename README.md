# AI Chat (ChatGPT 克隆)

一个 ChatGPT 风格的聊天应用，由 **AI Builder Space** 平台 API 驱动。

- 🗂️ **多会话**：新建/切换/重命名(双击)/删除/搜索，自动保存到浏览器 localStorage
- 🔄 **流式回复**：SSE 打字机输出，可停止 (Esc/按钮)，可**重新生成**、**编辑并重发**、**从此处截断分支**
- 🧠 **多模型分组选择**：日常/推理旗舰/快速三组 (deepseek-v4-flash/pro、gpt-5、grok-4-fast/4.5、kimi-k2.5、gemini 等)
- 🎛️ **参数面板**：温度 (0-2)、最大输出 tokens、系统提示词、**🔍 联网搜索开关** (Tavily 结果注入上下文)
- 🖼️ **图像生成页签**：gpt-image-1.5 / gemini-2.5-flash-image，尺寸/数量可选，支持下载
- 📝 **Markdown + 代码高亮**：代码块带语言标签与一键复制
- 🔑 **API Key 管理**：Key 只存在本浏览器，与平台自身行为一致
- 📱 **移动端适配**：侧边栏抽屉式展开

## 目录结构

```
chatgpt-clone/
├── src/
│   ├── App.jsx            # 主状态: 会话/模型/Key/流式编排
│   ├── api.js             # API 接入层 (models + SSE 流式 chat)
│   ├── storage.js         # localStorage 持久化
│   ├── index.css
│   └── components/
│       ├── Sidebar.jsx    # 会话侧边栏
│       ├── ChatView.jsx   # 聊天窗口 + 输入区 + 模型选择
│       ├── Message.jsx    # 消息气泡 + Markdown
│       └── KeyModal.jsx   # API Key 设置弹窗
├── server/main.py         # (部署用) FastAPI 单进程托管 dist 静态文件
├── Dockerfile             # (部署用) Node 构建 + Python 运行时
└── vite.config.js         # 开发代理 /backend → 平台后端
```

## 本地运行

```bash
cd chatgpt-clone
npm install          # 若 ~/.npm 无写权限: npm install --cache ./.npm-cache
npm run dev          # http://localhost:5174
```

1. 打开 http://localhost:5174
2. 点击右上角 ⚙️，填入平台 Settings 页面创建的 API Key (`sk_...`)
3. 选择模型，开始对话

## 技术要点：API 如何接入

- 应用内统一使用**相对路径** `/backend`（如 `/backend/v1/chat/completions`），因此：
  - **开发环境**：`vite.config.js` 把 `/backend` 代理到 `https://space.ai-builders.com`（平台后端 CORS 只放行特定 origin，本地直连会被浏览器拦截，代理可绕过）
  - **生产环境**：部署平台的 Nginx 层做同源代理（与平台自家前端相同模式）
- 需要直连时可用环境变量覆盖：`VITE_API_BASE=https://space.ai-builders.com/backend npm run build`
- 模型列表接口 `GET /backend/v1/models` 是公开的；对话 `POST /v1/chat/completions` 需要 `Authorization: Bearer sk_...`

## 部署到 AI Builder Space（Koyeb）

平台规则（来自官方部署指南）：

- 每用户默认最多 **2** 个服务，删除服务需联系导师
- 仓库必须**公开**、根目录必须有 `Dockerfile`、单进程单端口、容器内必须读 `PORT` 环境变量
- 构建时会自动注入 `AI_BUILDER_TOKEN`（不要写进 `env_vars`）

步骤：

```bash
# 1. 构建产物 + 部署文件 (仓库需公开)
git init && git add . && git commit -m "chat app"
git remote add origin https://github.com/<你>/<repo>.git
git push -u origin main

# 2. 触发部署 (service_name 同时是子域名, 小写字母/数字/连字符)
curl -X POST https://space.ai-builders.com/backend/v1/deployments \
  -H "Authorization: Bearer sk_你的key" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/<你>/<repo>.git",
    "service_name": "my-chat-app",
    "branch": "main",
    "port": 8000
  }'

# 3. 查看状态
curl https://space.ai-builders.com/backend/v1/deployments/my-chat-app \
  -H "Authorization: Bearer sk_你的key"
```

> ⚠️ 若部署后浏览器报 CORS/网络错误，说明该子域的 Nginx 未代理 `/backend`，需要改用
> `VITE_API_BASE` 直连并在平台侧开放对应 origin，或联系导师确认代理配置。

## 安全说明

- API Key 只保存在**你的浏览器 localStorage**，请求时直接发给平台后端，不经过任何第三方服务器
- 部署到 GitHub 时确保 **不要** 把 Key 提交进仓库（`.gitignore` 已包含 `.env`）
- 该 Key 与平台设置页同源：可在 Settings 随时吊销/重建
