# Multi-Agent Job Copilot

基于 LLM 的多 Agent 智能求职助手 — 上传简历，分析匹配，优化求职。

## 项目定位

帮助企业或个人完成岗位分析、简历优化、岗位匹配、面试准备等求职全流程。
后续可扩展为 **AI Career Coach** / **AI Recruiter** / **AI HR Assistant**。

## 技术栈

| 模块 | 技术 |
|------|------|
| 后端 | FastAPI + LangGraph |
| LLM | OpenAI Compatible (DeepSeek/Qwen/OpenAI) |
| 向量数据库 | ChromaDB |
| Embedding | bge-m3 |
| PDF 解析 | PyMuPDF |
| 前端 | Next.js + React |
| 数据库 | PostgreSQL (后续) |
| 部署 | Docker |

## 项目结构

```
multi-agent-job-copilot/
├── backend/
│   ├── app/
│   │   ├── agents/        # LangGraph Agent 定义
│   │   ├── api/            # FastAPI 路由
│   │   ├── models/         # Pydantic 数据模型
│   │   ├── rag/            # RAG 检索模块
│   │   ├── services/       # 业务逻辑（PDF解析、LLM分析）
│   │   ├── tools/          # Agent 工具
│   │   ├── utils/          # 工具函数
│   │   ├── config.py       # 配置管理
│   │   └── main.py         # 应用入口
│   ├── requirements.txt
│   └── .env
├── frontend/               # 前端代码
├── docker/                 # Docker 配置
└── README.md
```

## 快速开始

### 1. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 .env 填入你的 API Key
```

### 2. 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

访问 http://localhost:8000/docs 查看 API 文档。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000 使用应用。

### 使用 Docker

```bash
cd docker
docker-compose up --build
```

## API 接口

| Method | Path | 功能 |
|--------|------|------|
| POST | `/upload_resume` | 上传 PDF 简历 |
| POST | `/analyze_resume` | LLM 分析简历 |
| POST | `/match_job` | 简历与岗位匹配 |
| GET | `/` | 服务状态 |

## 开发计划

- [x] 项目初始化
- [x] PDF 简历解析
- [x] LLM 简历分析
- [x] 岗位匹配引擎
- [ ] RAG 知识库（行业知识检索）
- [ ] 多 Agent 协作（Planner + Interviewer）
- [ ] 面试准备 Agent
- [ ] 求职报告生成
- [ ] 前端 UI 完善
- [ ] Docker 部署
