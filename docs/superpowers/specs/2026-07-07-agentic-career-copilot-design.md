# Agentic Career Copilot — 系统设计文档

> 基于 LangGraph 的多 Agent 职业助手
> 版本: 0.2.0 | 日期: 2026-07-07

---

## 1. 项目定位

从单一的"AI 求职助手"升级为 **Agentic Career Copilot** — 一个基于 LangGraph 的多 Agent 协作系统，覆盖简历分析、岗位匹配、面试准备全流程。

### 目标

- 代码量 3000-5000 行
- 前后端分离
- 多 Agent 工作流（Orchestrator 调度模式）
- RAG 检索增强
- 结构化输出（Pydantic）
- 流式响应（SSE Streaming）
- Docker 部署
- GitHub Actions CI/CD
- 完整 README、架构图、演示

---

## 2. 系统架构

```
用户输入 → POST /chat (统一入口，支持 SSE)
                │
          ┌─────┴─────┐
          │ Orchestrator │ ← 意图分类 + 路由
          └─────┬─────┘
                │
     ┌──────┬───┼───┬──────┐
     ▼      ▼   ▼   ▼      ▼
  Resume  Job Match Interview RAG
  Agent  Agent Agent   Agent  检索
     │      │   │   │      │
     └──────┴───┴───┴──────┘
                │
          ┌─────┴─────┐
          │  汇总输出   │ ← SSE Streaming
          └───────────┘
```

### API 分层

```
POST /chat          — 统一入口，Orchestrator 调度（支持流式）
POST /chat/history  — 对话历史
POST /upload        — 文件上传（PDF 简历）

POST /api/resume    — Resume Agent（独立调用）
POST /api/job       — Job Agent（独立调用）
POST /api/match     — Match Agent（独立调用）

POST /rag/upload    — 上传知识文档
POST /rag/query     — RAG 检索
```

独立端点和 /chat 共存：/chat 做薄路由层，不重复 Agent 内部逻辑。

---

## 3. Agent 定义

### 3.1 Orchestrator Agent

- **职责**: 分析用户输入意图，路由到对应子 Agent，汇总结果
- **输入**: 用户消息文本（可选附带已上传简历 / JD）
- **输出**: 路由决策 + 子 Agent 执行结果
- **意图分类**: resume_analysis | job_analysis | match | interview | general

### 3.2 Resume Agent

- **职责**: 结构化解析简历
- **Tools**:
  - `parse_pdf(file_path) → str` — PyMuPDF 提取文本
  - `analyze_resume(text) → ResumeResult` — LLM 提取结构化信息
- **输出**:
  ```python
  ResumeResult {
    skills: list[str],
    education: EducationItem | None,
    experience: list[ExperienceItem],
    projects: list[ProjectItem],
    summary: str
  }
  ```

### 3.3 Job Agent

- **职责**: 解析岗位 JD，提取关键要求
- **Tools**:
  - `analyze_jd(text) → JobResult` — LLM 提取岗位信息
  - `rag_search_jd(query) → list[Document]` — 检索相似 JD
- **输出**:
  ```python
  JobResult {
    title: str,
    company: str,
    requirements: list[str],
    responsibilities: list[str],
    keywords: list[str]
  }
  ```

### 3.4 Match Agent

- **职责**: 计算简历与岗位匹配度
- **Tools**:
  - `match_skills(resume_skills, jd_requirements) → MatchResult`
- **输出**:
  ```python
  MatchResult {
    score: float (0-100),
    matched_skills: list[str],
    missing_skills: list[str],
    suggestions: list[str],
    analysis: str
  }
  ```

### 3.5 Interview Agent

- **职责**: 生成模拟面试题
- **Tools**:
  - `rag_search_questions(title, skills) → list[Question]`
  - `generate_questions(resume, jd) → list[Question]`
- **输出**:
  ```python
  InterviewResult {
    questions: list[{
      question: str,
      type: str,          # technical | behavioral | project
      difficulty: str,    # easy | medium | hard
      reference_answer: str
    }]
  }
  ```

---

## 4. LangGraph 工作流

使用 `StateGraph` 定义有向图：

```python
# state 定义
class AgentState(TypedDict):
    messages: list[BaseMessage]
    intent: str                    # Orchestrator 分类结果
    resume_text: str | None
    resume_analysis: dict | None
    jd_text: str | None
    jd_analysis: dict | None
    match_result: dict | None
    interview_result: dict | None
    current_agent: str

# 节点
orchestrator_node(state) → intent
resume_node(state) → resume_analysis
job_node(state) → jd_analysis
match_node(state) → match_result
interview_node(state) → interview_result

# 条件边
orchestrator → resume_node    (if intent == "resume")
orchestrator → job_node       (if intent == "job")
orchestrator → match_node     (if intent == "match")
orchestrator → interview_node (if intent == "interview")
orchestrator → end            (if intent == "general")
```

---

## 5. RAG 模块

- **向量数据库**: ChromaDB
- **Embedding 模型**: bge-m3 （通过 langchain 调用）
- **存储内容**:
  - 岗位 JD 库 — 上传的岗位描述
  - 面试题库 — 技术面试题 + 参考答案
  - 行业知识 — 后续扩展
- **检索方式**: 相似度检索 (top-k, k=5)

---

## 6. Streaming 实现

- 后端: `StreamingResponse` (SSE, `text/event-stream`)
- LangGraph: `.astream_events()` 逐 token 推送
- 事件格式:
  ```
  event: token
  data: {"content": "你", "agent": "match"}

  event: token
  data: {"content": "的", "agent": "match"}

  event: done
  data: {"agent": "match", "result": {...}}
  ```

---

## 7. Memory 实现

| 层级 | 技术 | 说明 |
|------|------|------|
| 短期 | LangGraph State | 单轮对话内上下文 |
| 对话 | JSON 文件存储 | 按 session_id 存储聊天记录 |
| 长期 | 后续 SQLite → PostgreSQL | 用户画像、偏好 |

对话历史文件结构: `data/sessions/{session_id}.json`

---

## 8. 前端（Next.js）

- 技术栈: Next.js 14 + Tailwind CSS
- 页面:
  - `/` — 主聊天界面（类 ChatGPT 风格）
  - `/dashboard` — 分析看板（简历/匹配结果展示）
- 核心交互:
  - 消息输入框 + 文件上传
  - 流式消息展示（打字机效果）
  - 技能雷达图、匹配度仪表盘

---

## 9. 项目目录结构

```
agentic-career-copilot/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── orchestrator.py    # Orchestrator Agent
│   │   │   ├── resume_agent.py    # Resume Agent
│   │   │   ├── job_agent.py       # Job Agent
│   │   │   ├── match_agent.py     # Match Agent
│   │   │   └── interview_agent.py # Interview Agent
│   │   ├── api/
│   │   │   ├── chat.py            # /chat 端点 (Streaming)
│   │   │   ├── resume.py          # /api/resume 端点
│   │   │   └── rag.py             # /rag 端点
│   │   ├── core/
│   │   │   ├── state.py           # LangGraph State 定义
│   │   │   ├── workflow.py        # LangGraph 图定义
│   │   │   └── memory.py          # 记忆管理
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic 数据模型
│   │   ├── rag/
│   │   │   ├── vector_store.py    # ChromaDB 封装
│   │   │   └── retriever.py       # 检索逻辑
│   │   ├── services/
│   │   │   ├── pdf_parser.py      # PyMuPDF 解析
│   │   │   └── llm.py             # LLM 客户端
│   │   ├── tools/
│   │   │   ├── resume_tools.py    # 简历工具
│   │   │   ├── job_tools.py       # 岗位工具
│   │   │   ├── match_tools.py     # 匹配工具
│   │   │   └── interview_tools.py # 面试工具
│   │   ├── config.py              # 配置
│   │   └── main.py                # 应用入口
│   ├── data/                      # 数据目录
│   │   ├── chroma/                # ChromaDB 持久化
│   │   └── sessions/              # 对话历史
│   ├── requirements.txt
│   └── .env
├── frontend/                      # Next.js 应用
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions
└── README.md
```

---

## 10. 开发路线

| 阶段 | 内容 | 预计代码量 |
|------|------|-----------|
| 1 | Resume Agent + Job Agent | ~800 行 |
| 2 | Match Agent + Interview Agent | ~600 行 |
| 3 | RAG 模块 (ChromaDB) | ~400 行 |
| 4 | LangGraph 工作流 + Orchestrator | ~500 行 |
| 5 | Memory + Streaming | ~400 行 |
| 6 | Tool Calling 完善 | ~300 行 |
| 7 | 可观测性 + 超时 + 重试机制 | ~300 行 |
| 8 | 测试策略（单元 + 集成） | ~400 行 |
| 9 | Next.js 前端 | ~800 行 |
| 10 | Docker + GitHub Actions | ~200 行 |
| 11 | README + ARCHITECTURE.md + 架构图 + Demo | ~300 行 |

---

## 11. 设计决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| Agent 协作 | Pipeline / **Orchestrator** | Orchestrator | 更灵活，支持动态路由 |
| API 设计 | 纯统一入口 / **混合模式** | 混合 | 效率 + 扩展性兼顾 |
| 向量库 | ChromaDB / Pinecone / Qdrant | ChromaDB | 本地运行，零成本部署 |
| Memory | 文件 / SQLite / PG | 先文件后 PG | 快速实现，后续升级 |
| Streaming | SSE / WebSocket | SSE | 实现简单，兼容性好 |

---

## 12. 工程化设计

### 12.1 错误重试与 Fallback 机制

LLM 调用可能因 API 超时、rate limit 等原因失败，设计多层容错：

```python
# 重试装饰器
def with_retry(max_retries=2, fallback_return=None):
    """Tool 调用重试装饰器
    - 指数退避等待（1s, 2s）
    - 失败后返回 fallback 而非抛 500
    - 记录重试日志
    """

# Fallback 策略
# - LLM 调用失败 → 返回缓存结果 / 简化版规则引擎结果
# - PDF 解析失败 → 返回友好错误提示
# - RAG 检索失败 → 返回空结果而非中断流程
```

**面试亮点**：说明"容错设计不是防御式编程，而是生产环境 LLM 应用的必修课"。

### 12.2 Agent 调用链可观测性

LangGraph 原生支持 callbacks，但需要主动接入：

```python
class AgentTracingCallback(BaseCallbackHandler):
    """追踪每个 Agent 调用的耗时、token 消耗、调用链"""
    def on_llm_start(self, serialized, prompts, **kwargs):
        request_id = get_current_request_id()
        logger.info(f"[{request_id}] LLM call started: {prompts[0][:50]}...")

    def on_llm_end(self, response, **kwargs):
        tokens = response.llm_output.get("token_usage", {})
        logger.info(f"[{request_id}] LLM done: {tokens}")
```

记录维度：
- 每次 LLM 调用的耗时和 token 数
- Agent 路由路径（Orchestrator → Resume → Match）
- 异常和重试事件

**面试亮点**："面试官，我可以展开讲怎么用 OpenTelemetry + LangSmith 做分布式追踪"。

### 12.3 请求 ID 追踪

```
POST /chat → 生成 request_id (uuid)
               │
               ↓ 贯穿所有日志
[req_abc123] Orchestrator: intent=resume
[req_abc123] Resume Agent: parse_pdf start
[req_abc123] Resume Agent: LLM analyze done (tokens=456)
[req_abc123] Response: stream completed (duration=3.2s)
```

实现方式：`contextvars` 在请求上下文中传递 request_id，日志格式化器自动注入。

### 12.4 Agent 超时控制

```python
async def run_agent_with_timeout(agent_call, timeout_seconds=30):
    """每个 Agent 执行加超时，避免单点卡死整体"""
    try:
        return await asyncio.wait_for(agent_call, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.warning(f"Agent timed out after {timeout_seconds}s")
        return {"error": "处理超时，请重试", "partial_result": ...}
```

| Agent | 超时时间 |
|-------|---------|
| Resume | 30s |
| Job | 30s |
| Match | 20s |
| Interview | 40s |
| RAG 检索 | 10s |

### 12.5 配置分层

```
config/
├── settings.py       # 环境变量 + 配置加载
├── prompts/          # Agent Prompt 模板
│   ├── resume.yaml
│   ├── job.yaml
│   ├── match.yaml
│   └── interview.yaml
└── agents.yaml       # Agent 参数：model、temperature、timeout
```

分离收益：
- Prompt 变更无需改代码
- 支持多模型切换（不同 Agent 可用不同模型）
- 面试时可以展示"我做了配置与代码分离"

### 12.6 测试策略

```
tests/
├── unit/
│   ├── test_pdf_parser.py      # PDF 解析测试
│   ├── test_resume_tools.py    # 工具函数测试
│   └── test_match_tools.py
├── integration/
│   ├── test_resume_agent.py    # Agent + LLM 集成测试
│   ├── test_match_agent.py
│   └── test_workflow.py        # LangGraph 工作流测试
└── conftest.py                 # 共享 Fixture
```

- 单元测试：Mock LLM 调用，只测逻辑
- 集成测试：使用 `pytest` + `httpx`，调用真实 API（可选开关）
- CI 中 `pytest --cov=app --cov-report=term-missing` 检查覆盖率

### 12.7 面试友好设计文档

```
docs/
├── ARCHITECTURE.md     # 系统架构图 + 设计决策说明
│                        # - 为什么选 Orchestrator 而非 Pipeline
│                        # - 为什么 ChromaDB + bge-m3
│                        # - 容错 / 可观测性设计思路
├── api.md              # 接口文档
└── superpowers/specs/  # 设计规格文档
```

**面试亮点**：文档能直接体现工程思维，面试官问"你碰到过什么技术挑战"时可以指着 ARCHITECTURE.md 说"我设计了多层容错和可观测性体系"。

---

## 13. 后续扩展

- 长期记忆 (PostgreSQL)
- MCP 协议支持
- 简历报告 PDF 生成
- 多语言支持
- 公司面经社区
- AI Recruiter / AI HR Assistant
