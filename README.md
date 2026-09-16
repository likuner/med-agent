# Medical Agent（医疗智能助手）

模仿 DeepSeek 聊天页布局的医疗问答 Agent，接入本地医学知识库 RAG。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16（App Router, TS）、Tailwind CSS v4、Ant Design 6、react-markdown |
| 后端 | Python 3.12、FastAPI、LangChain、LangGraph |
| LLM | DeepSeek API（`deepseek-chat` / `deepseek-reasoner` 深度思考） |
| RAG | PostgreSQL + pgvector（本地 `med-pgvector` 容器，`medrag` 库）+ bge-small-zh-v1.5 本地 embedding |

## 目录结构

```
backend/
  app/
    main.py             # FastAPI 入口
    config.py           # .env 配置
    routers/chat.py     # POST /api/chat  SSE 流式聊天
    routers/sessions.py # 会话/消息 CRUD
    routers/ingest.py   # 文档入库接口
    graph/              # LangGraph 医疗 Agent（router -> retrieve -> generate）
    rag/                # pgvector 检索 + 入库管道
    db/                 # sessions/messages 表
frontend/
  src/
    app/page.tsx        # DeepSeek 式聊天主页面
    components/         # Sidebar / MessageBubble / ChatInput / ThinkingProcess / CitationPanel
    lib/api.ts          # REST + SSE 流式解析
```

## 启动

```bash
# 0. 启动 pgvector 容器（已存在）
docker start med-pgvector   # 宿主机 5433 -> 5432，库 medrag

# 1. 后端（先在 backend/.env 填 DEEPSEEK_API_KEY，参考 .env.example）
cd backend
uv venv --python python3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --port 8000

# 2. 前端
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## 功能

- DeepSeek 风格聊天页：空态居中输入框、发送后转上下布局、左侧会话历史（重命名/删除/折叠）
- SSE 流式输出 + 打字机光标 + 停止生成
- 深度思考开关：切换 `deepseek-reasoner`，折叠展示思维链
- RAG 引用：回答附带检索到的 PubMed/WHO/NHS/MSD 文献片段、相似度与原文链接
- 多轮对话上下文，会话与消息持久化在 medrag 库
- 文档入库：`POST /api/ingest` 上传 .txt/.md 切分入库
