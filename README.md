# Agentic Career Copilot 🤖

基于 LangGraph 的多 Agent 智能求职助手 — 上传简历、分析匹配、准备面试、一站式求职。

## 项目定位

使用 **多 Agent 协作架构**（Orchestrator 调度模式），将求职流程拆分为 Resume、Job、Match、Interview 四个独立 Agent，通过 LangGraph StateGraph 工作流编排。支持流式对话（SSE）、RAG 知识检索、对话记忆、全链路追踪。

## 架构图

```
用户 → Next.js 前端 → FastAPI + LangGraph → LLM + ChromaDB
                        ├─ ResumeAgent   (简历分析)
                        ├─ JobAgent      (岗位解析)
                        ├─ MatchAgent    (匹配计算)
                        └─ InterviewAgent(面试准备)
```

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 技术栈

| 模块 | 技术 |
|------|------|
| 后端 | FastAPI + LangGraph + LangChain |
| LLM | OpenAI Compatible (DeepSeek/Qwen/OpenAI) |
| 向量数据库 | ChromaDB + bge-m3 |
| PDF 解析 | PyMuPDF |
| 前端 | Next.js 14 + React 18 + Tailwind CSS 3 |
| 部署 | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 快速开始

### 前置要求

- Python 3.12+
- Node.js 20+
- OpenAI 兼容 API Key

### 1. 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 LLM_API_KEY

# 启动
python -m app.main
# 访问 http://localhost:8000/docs 查看 API 文档
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000 使用应用
```

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
| POST | `/chat` | 统一聊天入口（自动路由） |
| POST | `/chat/stream` | SSE 流式聊天 |
| GET | `/chat/history` | 获取对话历史 |
| POST | `/rag/upload` | 上传文档到知识库 |
| POST | `/rag/query` | 检索知识库 |

## 开发路线

- [x] 项目初始化
- [x] PDF 简历解析
- [x] LLM 简历分析
- [x] 岗位匹配引擎
- [x] RAG 知识库
- [x] 多 Agent 协作（Orchestrator + 4 Agents）
- [x] LangGraph StateGraph 工作流
- [x] SSE 流式响应
- [x] 对话记忆（文件持久化）
- [x] 全链路追踪 + 请求 ID
- [x] 工程化（重试/超时/可观测）
- [x] Next.js 14 Chat UI
- [x] Docker 部署配置
- [x] GitHub Actions CI
- [x] 系统架构文档
