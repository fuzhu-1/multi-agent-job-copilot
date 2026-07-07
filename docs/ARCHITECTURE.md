# Agentic Career Copilot — 系统架构

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Chat UI (ChatPage + ChatMessage + ChatInput)     │  │
│  │  Sidebar (会话列表)                                │  │
│  │  API Client (lib/api.ts)                          │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ HTTP / SSE                     │
└─────────────────────────┼────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  Rewrites  │  (next.config.js → /api/* → localhost:8000)
                    └─────┬─────┘
                          │
┌─────────────────────────┼────────────────────────────────┐
│              Backend (FastAPI + LangGraph)                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Layer                                       │   │
│  │  ┌────────────────┐ ┌──────────┐ ┌───────────┐  │   │
│  │  │  resume.py      │ │ rag.py   │ │ chat.py   │  │   │
│  │  │  /upload_resume │ │ /rag/*   │ │ /chat     │  │   │
│  │  │  /analyze_resume│ │          │ │ /chat/stream│  │   │
│  │  │  /match_job     │ │          │ │ /chat/hist │  │   │
│  │  └────────┬───────┘ └────┬─────┘ └──────┬──────┘  │   │
│  └───────────┼──────────────┼──────────────┼──────────┘   │
│              │              │              │              │
│  ┌───────────┴──────────────┴──────────────┴──────────┐  │
│  │  Middleware: RequestIDMiddleware (X-Request-ID)     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  LangGraph Workflow (Orchestrator Pattern)         │  │
│  │                                                    │  │
│  │     ┌──────────────┐                               │  │
│  │     │ Orchestrator │  ← 意图分类 (关键词匹配)      │  │
│  │     └──────┬───────┘                               │  │
│  │     ┌──────┼──────┬──────┬──────┐                  │  │
│  │     ▼      ▼      ▼      ▼      ▼                  │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │  │
│  │ │Resume│ │ Job  │ │Match │ │Inter-│ │General│      │  │
│  │ │Agent │ │Agent │ │Agent │ │view  │ │(END)  │      │  │
│  │ └──────┘ └──────┘ └──────┘ │Agent │ └──────┘      │  │
│  │                             └──────┘               │  │
│  │  每个 Agent = Class-based (.run() 方法)            │  │
│  │  工具 = Function-based (call_structured_llm)       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  LLM Service   │  │  ChromaDB    │  │  Memory      │ │
│  │  ChatOpenAI    │  │  VectorStore │  │  Session     │ │
│  │  structured    │  │  cosine sim  │  │  File-based  │ │
│  │  output        │  │  hnsw:space  │  │  threading   │ │
│  └────────────────┘  └──────────────┘  │  Lock        │ │
│                                         └──────────────┘ │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Utils                                             │  │
│  │  retry.py (with_retry)  request_id.py (ContextVar) │  │
│  │  timeout.py (async wait_for)  tracing.py (Callback)│  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 设计决策

### 为什么选 Orchestrator 调度模式？

- **中心化路由**：Orchestrator 单一节点做意图分类，子 Agent 无状态、无耦合
- **易扩展**：新增 Agent 只需加一个节点 + 一个条件边
- **可观测**：所有路由决策集中在 orchestrator_node，日志清晰

### 为什么选 ChromaDB？

- **本地持久化**：PersistentClient 无需额外服务
- **即插即用**：pip install 即可使用，适合原型和小型生产
- **余弦相似度**：`hnsw:space = cosine` 适合文本 Embedding

### 为什么选 SSE 而非 WebSocket？

- **简单**：FastAPI 原生支持 StreamingResponse
- **兼容**：浏览器 EventSource API 直接消费
- **足够**：单方向流式输出，无需双向通信

### 为什么用文件存储 Session？

- **零依赖**：无需数据库
- **简单**：JSON 文件读写，threading.Lock 防并发
- **可替换**：后续可以平滑迁移到 Redis/PostgreSQL

## Agent 职责

| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| Orchestrator | 意图分类（关键词匹配） | 用户消息 | intent 标签 |
| ResumeAgent | 简历解析 + 结构化分析 | 简历文本/PDF | AnalyzeResumeResponse |
| JobAgent | 岗位描述分析 | JD 文本 | AnalyzeJobResponse |
| MatchAgent | 简历-岗位匹配计算 | 简历 + JD | MatchJobResponse |
| InterviewAgent | 面试题生成 | 简历 + JD(可选) | InterviewResponse |

## 数据流

```
用户消息 → Orchestrator(意图分类)
  ├─ "简历/上传" → ResumeAgent → LLM 分析 → 结构化结果
  ├─ "岗位/JD"   → JobAgent → LLM 分析 → 结构化结果
  ├─ "匹配"      → MatchAgent → LLM 匹配 → 评分+建议
  ├─ "面试"      → InterviewAgent → LLM 出题 → 面试题列表
  └─ "其他"      → 直接回复（兜底）
```

## 工程化设计

### 重试机制 (`utils/retry.py`)

- `with_retry(max_retries=2, fallback_return=None)` 装饰器
- 指数退避：1s → 2s
- 全部失败后返回 fallback 值而非抛异常
- 在 async 上下文中通过 asyncio.to_thread 隔离

### 可观测性 (`utils/tracing.py`)

- `AgentTracingCallback(BaseCallbackHandler)`
- 追踪 LLM 调用耗时、token 消耗
- 通过 run_id 正确匹配 start/end
- 请求 ID 贯穿所有日志（`[req_xxx]`）

### 超时控制 (`utils/timeout.py`)

- `run_with_timeout(coro, timeout_seconds, agent_name)`
- 基于 asyncio.wait_for
- 超时返回 `{error: "xxx 处理超时"}` 而非崩溃

### 请求 ID (`utils/request_id.py`)

- ContextVar 实现请求级隔离
- 中间件自动生成 `req_xxx` 格式 ID
- 响应头 `X-Request-ID` 透传到客户端

### 测试策略

- pytest + pytest-cov，目标 80%+
- 单元测试：pdf_parser、retry、request_id
- 集成测试（计划）：API 端点、LangGraph workflow

## 技术栈

| 模块 | 技术 |
|------|------|
| 后端框架 | FastAPI |
| 工作流引擎 | LangGraph (StateGraph) |
| LLM | OpenAI Compatible (DeepSeek/Qwen/OpenAI) |
| 向量数据库 | ChromaDB (PersistentClient, cosine) |
| PDF 解析 | PyMuPDF |
| 前端 | Next.js 14 + React 18 + Tailwind CSS 3 |
| 部署 | Docker + Docker Compose |
| CI/CD | GitHub Actions |
