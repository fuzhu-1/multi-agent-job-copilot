# Agentic Career Copilot — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 Mono-agent 后端重构为多 Agent 架构（Resume / Job / Match / Interview + Orchestrator），集成 RAG、Streaming、Memory、可观测性等工程化能力

**Architecture:** Orchestrator 调度模式。用户请求统一经 `/chat` 入口，Orchestrator 根据意图路由到子 Agent。保留独立端点作为直接调用通道。

**Tech Stack:** FastAPI + LangGraph + LangChain + ChromaDB + bge-m3 + SSE Streaming

**当前代码库状态（起点）：**
```
backend/app/
├── api/resume.py          # 3 个端点（upload/analyze/match）
├── services/
│   ├── pdf_parser.py      # PyMuPDF 解析
│   └── analyzer.py        # LLM 分析 + 匹配
├── models/schemas.py      # Pydantic 模型
├── config.py              # 配置
└── main.py                # 应用入口
```

---

## 第一阶段：Resume Agent + Job Agent

目标：重构代码结构，将 Resume 和 Job 分析能力封装为独立 Agent。确保 `/upload_resume` 和 `/analyze_resume` 在重构后仍然可用。

### 任务 1.1：创建新目录结构，移动 LLM 服务

**Files:**
- Create: `backend/app/services/llm.py`
- Modify: `backend/app/services/__init__.py`

- [ ] **Step 1: 创建 backend/app/core/ 目录**

```bash
mkdir -p backend/app/core
touch backend/app/core/__init__.py
```

- [ ] **Step 2: 从 analyzer.py 中提取 LLM 客户端到 services/llm.py**

```python
"""LLM 客户端封装"""

import logging
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    """获取 LLM 实例"""
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        temperature=temperature,
    )


def call_structured_llm(
    prompt: str,
    schema: type[BaseModel],
    temperature: float = 0.1,
) -> BaseModel:
    """调用 LLM 并返回结构化输出

    Args:
        prompt: 提示词
        schema: Pydantic 输出模型
        temperature: 温度参数

    Returns:
        结构化输出实例
    """
    llm = get_llm(temperature=temperature)
    structured = llm.with_structured_output(schema)
    result = structured.invoke(prompt)
    logger.info("LLM 调用完成，schema=%s", schema.__name__)
    return result
```

### 任务 1.2：扩展 Pydantic 数据模型

**Files:**
- Modify: `backend/app/models/schemas.py`

- [ ] **Step 1: 添加新模型到 schemas.py**

```python
"""Pydantic 数据模型定义"""

from pydantic import BaseModel, Field


# ── 通用 ─────────────────────────────────────────────

class ProjectItem(BaseModel):
    """项目经历条目"""
    name: str = Field(default="", description="项目名称")
    role: str = Field(default="", description="担任角色")
    description: list[str] = Field(default_factory=list, description="项目描述")
    tech_stack: list[str] = Field(default_factory=list, description="技术栈")


# ── 简历相关 ─────────────────────────────────────────

class ResumeUploadResponse(BaseModel):
    """上传简历后的返回结果"""
    filename: str = Field(description="文件名")
    text: str = Field(description="PDF 解析出的纯文本内容")


class ExperienceItem(BaseModel):
    """工作经历条目"""
    company: str = Field(default="", description="公司名称")
    position: str = Field(default="", description="职位")
    duration: str = Field(default="", description="时间范围")
    description: list[str] = Field(default_factory=list, description="工作描述")


class EducationItem(BaseModel):
    """教育经历条目"""
    school: str = Field(default="", description="学校名称")
    degree: str = Field(default="", description="学位")
    major: str = Field(default="", description="专业")
    duration: str = Field(default="", description="时间范围")


class AnalyzeResumeRequest(BaseModel):
    """简历分析请求"""
    text: str = Field(description="简历文本")


class AnalyzeResumeResponse(BaseModel):
    """简历分析结果"""
    skills: list[str] = Field(description="技能列表")
    education: EducationItem | None = None
    experience: list[ExperienceItem] = Field(default_factory=list, description="工作经历列表")
    projects: list[ProjectItem] = Field(default_factory=list, description="项目经历列表")
    summary: str = Field(default="", description="个人简介")


# ── 岗位相关 ─────────────────────────────────────────

class AnalyzeJobRequest(BaseModel):
    """岗位分析请求"""
    text: str = Field(description="岗位描述文本")


class AnalyzeJobResponse(BaseModel):
    """岗位分析结果"""
    title: str = Field(default="", description="岗位名称")
    company: str = Field(default="", description="公司名称")
    requirements: list[str] = Field(default_factory=list, description="硬性要求")
    responsibilities: list[str] = Field(default_factory=list, description="岗位职责")
    keywords: list[str] = Field(default_factory=list, description="关键词")
    summary: str = Field(default="", description="岗位简介")


# ── 匹配相关 ─────────────────────────────────────────

class MatchJobRequest(BaseModel):
    """岗位匹配请求"""
    resume_text: str = Field(description="简历文本")
    job_description: str = Field(description="岗位描述")


class MatchJobResponse(BaseModel):
    """岗位匹配结果"""
    match_score: float = Field(description="匹配度分数 (0-100)")
    matched_skills: list[str] = Field(description="匹配的技能")
    missing_skills: list[str] = Field(description="缺失的技能")
    suggestions: list[str] = Field(description="优化建议")
    analysis: str = Field(description="综合分析")


# ── 面试相关 ─────────────────────────────────────────

class InterviewQuestion(BaseModel):
    """面试题条目"""
    question: str = Field(description="问题")
    type: str = Field(description="类型: technical / behavioral / project")
    difficulty: str = Field(description="难度: easy / medium / hard")
    reference_answer: str = Field(default="", description="参考回答")


class InterviewResponse(BaseModel):
    """面试题生成结果"""
    questions: list[InterviewQuestion] = Field(description="面试题列表")


# ── 聊天相关 ─────────────────────────────────────────

class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(description="用户消息")
    session_id: str | None = Field(default=None, description="会话 ID")


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str = Field(description="助手回复")
    session_id: str = Field(description="会话 ID")
```

### 任务 1.3：创建 Resume Tools

**Files:**
- Create: `backend/app/tools/resume_tools.py`

- [ ] **Step 1: 写入 resume_tools.py**

```python
"""Resume Agent 工具函数"""

import logging

from app.models.schemas import (
    AnalyzeResumeResponse,
    EducationItem,
    ExperienceItem,
    ProjectItem,
)
from app.services.llm import call_structured_llm
from app.services.pdf_parser import extract_text_from_pdf
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class LLMResumeResult(BaseModel):
    """LLM 简历分析中间结果"""
    skills: list[str]
    education_school: str = ""
    education_degree: str = ""
    education_major: str = ""
    education_duration: str = ""
    experience: list[dict] = []
    projects: list[dict] = []
    summary: str = ""


def parse_pdf(file_path: str) -> str:
    """解析 PDF 文件为文本"""
    return extract_text_from_pdf(file_path)


def analyze_resume_text(text: str) -> AnalyzeResumeResponse:
    """调用 LLM 分析简历文本，返回结构化结果"""
    prompt = (
        "你是一位专业的 HR 分析师。请从以下简历文本中提取结构化信息。\n\n"
        f"简历文本：\n{text}\n\n"
        "请提取：\n"
        "1. skills：候选人的技能列表（技术栈、语言、工具等）\n"
        "2. education_school / education_degree / education_major / education_duration：教育经历\n"
        "3. experience：工作经历列表，每项包含 company, position, duration, description\n"
        "4. projects：项目经历列表，每项包含 name, role, description, tech_stack\n"
        "5. summary：个人简介摘要（2-3句话）"
    )

    result: LLMResumeResult = call_structured_llm(prompt, LLMResumeResult)

    education = None
    if result.education_school:
        education = EducationItem(
            school=result.education_school,
            degree=result.education_degree,
            major=result.education_major,
            duration=result.education_duration,
        )

    experience = [
        ExperienceItem(**exp) if isinstance(exp, dict) else exp
        for exp in result.experience
    ]

    projects = [
        ProjectItem(**proj) if isinstance(proj, dict) else proj
        for proj in result.projects
    ]

    return AnalyzeResumeResponse(
        skills=result.skills,
        education=education,
        experience=experience,
        projects=projects,
        summary=result.summary,
    )
```

### 任务 1.4：创建 Resume Agent

**Files:**
- Create: `backend/app/agents/resume_agent.py`

- [ ] **Step 1: 写入 resume_agent.py**

```python
"""Resume Agent — 简历分析专家"""

import logging

from app.models.schemas import AnalyzeResumeResponse
from app.tools.resume_tools import analyze_resume_text, parse_pdf

logger = logging.getLogger(__name__)


class ResumeAgent:
    """负责简历上传、解析和结构化分析"""

    def __init__(self):
        self.name = "resume_agent"

    def run(self, resume_text: str | None = None, file_path: str | None = None) -> AnalyzeResumeResponse:
        """执行简历分析

        Args:
            resume_text: 已有简历文本（可选）
            file_path: PDF 文件路径（可选）

        Returns:
            结构化简历分析结果
        """
        text = resume_text
        if file_path and not text:
            logger.info("从 PDF 解析文本: %s", file_path)
            text = parse_pdf(file_path)

        if not text:
            raise ValueError("无简历文本可分析")

        logger.info("ResumeAgent 开始分析简历 (%d 字符)", len(text))
        result = analyze_resume_text(text)
        logger.info("ResumeAgent 分析完成: %d 项技能, %d 段经历",
                     len(result.skills), len(result.experience))
        return result
```

### 任务 1.5：创建 Job Tools + Job Agent

**Files:**
- Create: `backend/app/tools/job_tools.py`
- Create: `backend/app/agents/job_agent.py`

- [ ] **Step 1: 写入 job_tools.py**

```python
"""Job Agent 工具函数"""

import logging

from app.models.schemas import AnalyzeJobResponse
from app.services.llm import call_structured_llm
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class LLMJobResult(BaseModel):
    """LLM 岗位分析中间结果"""
    title: str = ""
    company: str = ""
    requirements: list[str] = []
    responsibilities: list[str] = []
    keywords: list[str] = []
    summary: str = ""


def analyze_jd_text(text: str) -> AnalyzeJobResponse:
    """调用 LLM 分析岗位描述"""
    prompt = (
        "你是一位专业的招聘顾问。请从以下岗位描述中提取结构化信息。\n\n"
        f"岗位描述：\n{text}\n\n"
        "请提取：\n"
        "1. title：岗位名称\n"
        "2. company：公司名称\n"
        "3. requirements：硬性要求列表（技能、年限、学历等）\n"
        "4. responsibilities：岗位职责列表\n"
        "5. keywords：关键词列表（技术栈、工具、领域等）\n"
        "6. summary：岗位简介（1-2句话）"
    )

    result: LLMJobResult = call_structured_llm(prompt, LLMJobResult)
    return AnalyzeJobResponse(**result.model_dump())
```

- [ ] **Step 2: 写入 job_agent.py**

```python
"""Job Agent — 岗位解析专家"""

import logging

from app.models.schemas import AnalyzeJobResponse
from app.tools.job_tools import analyze_jd_text

logger = logging.getLogger(__name__)


class JobAgent:
    """负责岗位描述解析和分析"""

    def __init__(self):
        self.name = "job_agent"

    def run(self, jd_text: str) -> AnalyzeJobResponse:
        """执行岗位分析

        Args:
            jd_text: 岗位描述文本

        Returns:
            结构化岗位分析结果
        """
        logger.info("JobAgent 开始分析岗位 (%d 字符)", len(jd_text))
        result = analyze_jd_text(jd_text)
        logger.info("JobAgent 分析完成: %s @ %s", result.title, result.company)
        return result
```

### 任务 1.6：重构 API 端点 + 更新 main.py + config.py

**Files:**
- Modify: `backend/app/api/resume.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/config.py`

- [ ] **Step 1: 重写 api/resume.py 接入 ResumeAgent**

```python
"""简历上传与分析 API"""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.agents.resume_agent import ResumeAgent
from app.config import settings
from app.models.schemas import (
    AnalyzeResumeRequest,
    AnalyzeResumeResponse,
    MatchJobRequest,
    MatchJobResponse,
    ResumeUploadResponse,
)
from app.services.analyzer import match_resume_with_jd
from app.services.pdf_parser import extract_text_from_pdf, PDFParserError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["resume"])

resume_agent = ResumeAgent()


@router.post("/upload_resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile) -> ResumeUploadResponse:
    """上传 PDF 简历并解析文本内容"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 文件格式")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(exist_ok=True)

    file_id = uuid.uuid4().hex[:8]
    save_path = upload_dir / f"{file_id}_{file.filename}"

    try:
        content = await file.read()
        save_path.write_bytes(content)
        logger.info("文件已保存: %s (%d bytes)", save_path, len(content))
    except Exception as e:
        logger.error("文件保存失败: %s", e)
        raise HTTPException(status_code=500, detail=f"文件保存失败: {e}")

    try:
        text = extract_text_from_pdf(save_path)
    except PDFParserError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return ResumeUploadResponse(filename=file.filename, text=text)


@router.post("/analyze_resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(request: AnalyzeResumeRequest) -> AnalyzeResumeResponse:
    """分析简历文本，提取结构化信息"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")

    try:
        result = resume_agent.run(resume_text=request.text)
        return result
    except Exception as e:
        logger.error("简历分析失败: %s", e)
        raise HTTPException(status_code=500, detail=f"简历分析失败: {e}")


@router.post("/match_job", response_model=MatchJobResponse)
async def match_job(request: MatchJobRequest) -> MatchJobResponse:
    """分析简历与岗位的匹配度"""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="岗位描述不能为空")

    try:
        result = match_resume_with_jd(request.resume_text, request.job_description)
        return MatchJobResponse(**result)
    except Exception as e:
        logger.error("岗位匹配失败: %s", e)
        raise HTTPException(status_code=500, detail=f"岗位匹配失败: {e}")
```

- [ ] **Step 2: 更新 app 名称和版本**

Edit `backend/app/main.py`:
```python
# 第 20-23 行
app = FastAPI(
    title="Agentic Career Copilot",
    description="基于 LangGraph 的多 Agent 智能职业助手 API",
    version="0.2.0",
)
```

Also update root endpoint:
```python
@app.get("/")
async def root():
    return {
        "app": "Agentic Career Copilot",
        "version": "0.2.0",
        "agents": ["resume", "job", "match", "interview"],
        "docs": "/docs",
    }
```

- [ ] **Step 3: 更新 config.py 添加新配置项**

```python
"""应用配置"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，从环境变量读取"""

    # LLM 配置
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"

    # 服务配置
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # 上传配置
    upload_dir: str = "uploads"

    # Agent 配置
    agent_timeout: int = 30
    max_retries: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 4: 验证后端能正常启动**

```bash
cd backend
source .venv/Scripts/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 &
sleep 3
curl -s http://127.0.0.1:8001/ | python -c "import sys,json; d=json.load(sys.stdin); print(d['app'], d['version'])"
# 预期输出: Agentic Career Copilot 0.2.0

curl -s -X POST http://127.0.0.1:8001/analyze_resume \
  -H "Content-Type: application/json" \
  -d '{"text":"张三是一名Python后端开发者，熟悉FastAPI、Django"}' | python -c "import sys,json; d=json.load(sys.stdin); print(f'skills: {d.get(\"skills\",[])}')"
# 预期: skills: [...] 或是 api key error（说明端点通了）
```

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add ResumeAgent and JobAgent, restructure backend

- Extract LLM client to services/llm.py
- Expand Pydantic schemas with ProjectItem, Job, Interview models
- Create ResumeAgent with PDF parsing + LLM analysis tools
- Create JobAgent with JD analysis tools
- Rename app to Agentic Career Copilot v0.2.0
- Keep existing endpoints backward compatible"
```

---

## 第二阶段：Match Agent + Interview Agent

目标：将匹配逻辑封装为 Match Agent，新增 Interview Agent 生成面试题。

### 任务 2.1：创建 Match Tools + Match Agent

**Files:**
- Create: `backend/app/tools/match_tools.py`
- Create: `backend/app/agents/match_agent.py`
- Modify: `backend/app/api/resume.py`（接入 MatchAgent）

- [ ] **Step 1: 写入 match_tools.py**

```python
"""Match Agent 工具函数"""

import logging

from app.models.schemas import MatchJobResponse
from app.services.llm import call_structured_llm
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class LLMMatchResult(BaseModel):
    """LLM 匹配结果中间结构"""
    match_score: float = Field(ge=0, le=100)
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    suggestions: list[str] = []
    analysis: str = ""


def calculate_match(resume_text: str, jd_text: str) -> MatchJobResponse:
    """调用 LLM 计算简历与岗位匹配度"""
    prompt = (
        "你是一位专业的招聘顾问。请分析以下简历与岗位描述的匹配度。\n\n"
        f"简历文本：\n{resume_text}\n\n"
        f"岗位描述：\n{jd_text}\n\n"
        "请返回：\n"
        "1. match_score：匹配度分数（0-100 的整数）\n"
        "2. matched_skills：简历中与岗位匹配的技能列表\n"
        "3. missing_skills：岗位要求但简历中缺失的技能列表\n"
        "4. suggestions：针对简历的优化建议（3-5条具体可操作的建议）\n"
        "5. analysis：综合分析，说明匹配与不匹配的原因（100-200字）"
    )

    result: LLMMatchResult = call_structured_llm(prompt, LLMMatchResult)
    return MatchJobResponse(**result.model_dump())
```

- [ ] **Step 2: 写入 match_agent.py**

```python
"""Match Agent — 匹配分析专家"""

import logging

from app.models.schemas import MatchJobResponse
from app.tools.match_tools import calculate_match

logger = logging.getLogger(__name__)


class MatchAgent:
    """负责计算简历与岗位的匹配度"""

    def __init__(self):
        self.name = "match_agent"

    def run(self, resume_text: str, jd_text: str) -> MatchJobResponse:
        """执行匹配分析"""
        logger.info("MatchAgent 开始匹配分析")
        result = calculate_match(resume_text, jd_text)
        logger.info("MatchAgent 匹配完成: 分数=%.1f", result.match_score)
        return result
```

- [ ] **Step 3: 更新 api/resume.py 接入 MatchAgent**

```python
# 在文件顶部添加
from app.agents.match_agent import MatchAgent

# 在 router 定义后添加
match_agent = MatchAgent()

# 修改 match_job 端点
@router.post("/match_job", response_model=MatchJobResponse)
async def match_job(request: MatchJobRequest) -> MatchJobResponse:
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="岗位描述不能为空")

    try:
        result = match_agent.run(resume_text=request.resume_text, jd_text=request.job_description)
        return result
    except Exception as e:
        logger.error("岗位匹配失败: %s", e)
        raise HTTPException(status_code=500, detail=f"岗位匹配失败: {e}")
```

### 任务 2.2：创建 Interview Tools + Interview Agent

**Files:**
- Create: `backend/app/tools/interview_tools.py`
- Create: `backend/app/agents/interview_agent.py`

- [ ] **Step 1: 写入 interview_tools.py**

```python
"""Interview Agent 工具函数"""

import logging

from app.models.schemas import InterviewQuestion, InterviewResponse
from app.services.llm import call_structured_llm
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class LLMQuestionItem(BaseModel):
    """LLM 面试题中间结构"""
    question: str = ""
    type: str = ""
    difficulty: str = ""
    reference_answer: str = ""


class LLMInterviewResult(BaseModel):
    """LLM 面试题生成结果"""
    questions: list[LLMQuestionItem] = []


def generate_interview_questions(
    resume_text: str,
    jd_text: str | None = None,
) -> InterviewResponse:
    """调用 LLM 生成面试题"""
    jd_section = f"\n岗位描述：\n{jd_text}\n" if jd_text else ""

    prompt = (
        "你是一位资深技术面试官。请根据以下信息生成面试题。\n\n"
        f"简历信息：\n{resume_text}\n"
        f"{jd_section}\n"
        "请生成 5-8 道面试题，覆盖以下类型：\n"
        "1. technical：技术问题（考察硬技能）\n"
        "2. behavioral：行为问题（考察软技能）\n"
        "3. project：项目问题（考察项目经验）\n\n"
        "每道题包含 question, type, difficulty (easy/medium/hard), reference_answer"
    )

    result: LLMInterviewResult = call_structured_llm(prompt, LLMInterviewResult)
    questions = [
        InterviewQuestion(**q.model_dump()) for q in result.questions
    ]
    return InterviewResponse(questions=questions)
```

- [ ] **Step 2: 写入 interview_agent.py**

```python
"""Interview Agent — 面试准备专家"""

import logging

from app.models.schemas import InterviewResponse
from app.tools.interview_tools import generate_interview_questions

logger = logging.getLogger(__name__)


class InterviewAgent:
    """负责生成模拟面试题"""

    def __init__(self):
        self.name = "interview_agent"

    def run(
        self,
        resume_text: str,
        jd_text: str | None = None,
    ) -> InterviewResponse:
        """执行面试题生成"""
        logger.info("InterviewAgent 开始生成面试题")
        result = generate_interview_questions(resume_text, jd_text)
        logger.info("InterviewAgent 生成完成: %d 道题", len(result.questions))
        return result
```

- [ ] **Step 3: 验证所有 Agent 可用**

```bash
# 确认所有文件无语法错误
python -c "
from app.agents.resume_agent import ResumeAgent
from app.agents.job_agent import JobAgent
from app.agents.match_agent import MatchAgent
from app.agents.interview_agent import InterviewAgent
print('All agents imported successfully')
"
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add MatchAgent and InterviewAgent

- MatchAgent: 计算简历与岗位匹配度
- InterviewAgent: 基于简历和 JD 生成面试题
- 重构 /match_job 端点接入 MatchAgent
- 新增 AnalyzeJobResponse / InterviewResponse 等模型"
```

---

## 第三阶段：RAG 模块

目标：实现基于 ChromaDB 的知识库，支持 JD 和面试题存储检索。

### 任务 3.1：创建 RAG 模块

**Files:**
- Create: `backend/app/rag/vector_store.py`
- Create: `backend/app/rag/retriever.py`
- Create: `backend/app/api/rag.py`
- Modify: `backend/app/main.py`（注册 RAG 路由）

- [ ] **Step 1: 写入 vector_store.py**

```python
"""ChromaDB 向量数据库封装"""

import logging
import os
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parents[2] / "data" / "chroma"


class VectorStore:
    """ChromaDB 向量数据库封装"""

    def __init__(self, collection_name: str = "knowledge_base"):
        os.makedirs(CHROMA_DIR, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("向量数据库已初始化: %s/%s", CHROMA_DIR, collection_name)

    def add_documents(self, ids: list[str], texts: list[str], metadatas: list[dict] | None = None):
        """添加文档到向量库"""
        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas or [{}] * len(texts),
        )
        logger.info("已添加 %d 条文档到向量库", len(texts))

    def similarity_search(self, query: str, k: int = 5) -> list[dict]:
        """相似度检索"""
        results = self.collection.query(
            query_texts=[query],
            n_results=k,
        )
        docs = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                docs.append({
                    "text": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                })
        return docs
```

- [ ] **Step 2: 写入 retriever.py**

```python
"""RAG 检索服务"""

import logging
import uuid

from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

store = VectorStore()


def add_to_knowledge_base(text: str, metadata: dict | None = None) -> str:
    """添加文档到知识库"""
    doc_id = uuid.uuid4().hex[:12]
    store.add_documents(
        ids=[doc_id],
        texts=[text],
        metadatas=[metadata or {"source": "manual"}],
    )
    return doc_id


def search_knowledge_base(query: str, k: int = 5) -> list[dict]:
    """检索知识库"""
    return store.similarity_search(query, k=k)
```

- [ ] **Step 3: 写入 api/rag.py**

```python
"""RAG 知识库 API"""

import logging

from fastapi import APIRouter, HTTPException

from app.rag.retriever import add_to_knowledge_base, search_knowledge_base
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rag", tags=["rag"])


class RAGUploadRequest(BaseModel):
    text: str = Field(description="文档内容")
    source: str = Field(default="manual", description="来源")


class RAGQueryRequest(BaseModel):
    query: str = Field(description="查询文本")
    k: int = Field(default=5, ge=1, le=20, description="返回结果数")


@router.post("/upload")
async def upload_document(request: RAGUploadRequest):
    """上传文档到 RAG 知识库"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="文档内容不能为空")
    doc_id = add_to_knowledge_base(request.text, {"source": request.source})
    return {"id": doc_id, "message": "文档已添加"}


@router.post("/query")
async def query_knowledge(request: RAGQueryRequest):
    """检索 RAG 知识库"""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="查询内容不能为空")
    results = search_knowledge_base(request.query, k=request.k)
    return {"results": results}
```

- [ ] **Step 4: 注册 RAG 路由到 main.py**

```python
# 添加到 main.py 顶部
from app.api.rag import router as rag_router

# 在 include_router 区域添加
app.include_router(rag_router)
```

- [ ] **Step 5: 验证**

```bash
cd backend && source .venv/Scripts/activate
python -c "
from app.rag.vector_store import VectorStore
vs = VectorStore('test_collection')
vs.add_documents(['1'], ['Python FastAPI 开发者'])
result = vs.similarity_search('Python 后端', k=1)
print('RAG test:', result[0]['text'][:30] if result else 'empty')
"
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add RAG module with ChromaDB

- ChromaDB 向量数据库封装 (VectorStore)
- RAG 检索服务 (retriever)
- /rag/upload 和 /rag/query API 端点
- 支持 JD 库、面试题库的存储和检索"
```

---

## 第四阶段：LangGraph 工作流 + Orchestrator

目标：创建 LangGraph StateGraph，Orchestrator 根据意图路由到子 Agent。

### 任务 4.1：创建 Core 模块

**Files:**
- Create: `backend/app/core/state.py`
- Create: `backend/app/core/workflow.py`

- [ ] **Step 1: 写入 state.py**

```python
"""LangGraph State 定义"""

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """LangGraph 全局状态"""
    messages: Annotated[list, add_messages]
    intent: str                     # Orchestrator 分类: resume | job | match | interview | general
    resume_text: str | None
    resume_analysis: dict | None
    jd_text: str | None
    jd_analysis: dict | None
    match_result: dict | None
    interview_result: dict | None
    current_agent: str
    error: str | None
```

- [ ] **Step 2: 写入 workflow.py**

```python
"""LangGraph 工作流定义"""

import logging

from langgraph.graph import END, StateGraph

from app.agents.interview_agent import InterviewAgent
from app.agents.job_agent import JobAgent
from app.agents.match_agent import MatchAgent
from app.agents.resume_agent import ResumeAgent
from app.core.state import AgentState

logger = logging.getLogger(__name__)

resume_agent = ResumeAgent()
job_agent = JobAgent()
match_agent = MatchAgent()
interview_agent = InterviewAgent()


def orchestrator_node(state: AgentState) -> dict:
    """Orchestrator 节点：判断意图"""
    user_message = state["messages"][-1].content.lower() if state["messages"] else ""

    intent = "general"
    if any(kw in user_message for kw in ["简历", "resume", "上传", "pdf"]):
        intent = "resume"
    elif any(kw in user_message for kw in ["岗位", "职位", "jd", "job", "招聘"]):
        intent = "job"
    elif any(kw in user_message for kw in ["匹配", "match", "对比", "适合"]):
        intent = "match"
    elif any(kw in user_message for kw in ["面试", "interview", "题目", "问题"]):
        intent = "interview"

    logger.info("Orchestrator 意图分类: %s", intent)
    return {"intent": intent, "current_agent": intent}


def resume_node(state: AgentState) -> dict:
    """Resume Agent 节点"""
    text = state.get("resume_text") or (state["messages"][-1].content if state["messages"] else "")
    try:
        result = resume_agent.run(resume_text=text)
        return {"resume_analysis": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("ResumeAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def job_node(state: AgentState) -> dict:
    """Job Agent 节点"""
    text = state.get("jd_text") or (state["messages"][-1].content if state["messages"] else "")
    try:
        result = job_agent.run(text)
        return {"jd_analysis": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("JobAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def match_node(state: AgentState) -> dict:
    """Match Agent 节点"""
    resume = state.get("resume_text") or ""
    jd = state.get("jd_text") or ""
    try:
        result = match_agent.run(resume, jd)
        return {"match_result": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("MatchAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def interview_node(state: AgentState) -> dict:
    """Interview Agent 节点"""
    resume = state.get("resume_text") or ""
    jd = state.get("jd_text")
    try:
        result = interview_agent.run(resume, jd)
        return {"interview_result": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("InterviewAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def router_condition(state: AgentState) -> str:
    """条件边：根据 intent 路由"""
    if state.get("error"):
        return "end"
    return state.get("intent", "general")


def build_workflow() -> StateGraph:
    """构建 LangGraph 工作流"""
    workflow = StateGraph(AgentState)

    # 注册节点
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("resume", resume_node)
    workflow.add_node("job", job_node)
    workflow.add_node("match", match_node)
    workflow.add_node("interview", interview_node)

    # 设置入口
    workflow.set_entry_point("orchestrator")

    # 条件边
    workflow.add_conditional_edges(
        "orchestrator",
        router_condition,
        {
            "resume": "resume",
            "job": "job",
            "match": "match",
            "interview": "interview",
            "general": END,
            "end": END,
        },
    )

    # 子 Agent 完成后返回
    for agent in ["resume", "job", "match", "interview"]:
        workflow.add_edge(agent, END)

    return workflow.compile()


# 全局工作流实例
agent_workflow = build_workflow()
```

- [ ] **Step 3: 验证工作流可以编译**

```bash
cd backend && source .venv/Scripts/activate
python -c "
from app.core.workflow import agent_workflow
print('Workflow compiled successfully')
print('Nodes:', list(agent_workflow.get_graph().nodes.keys()))
"
```

### 任务 4.2：创建 /chat 端点

**Files:**
- Create: `backend/app/api/chat.py`
- Modify: `backend/app/main.py`（注册 chat 路由）

- [ ] **Step 1: 写入 api/chat.py**

```python
"""聊天 API — 统一入口"""

import logging
import uuid

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage

from app.core.workflow import agent_workflow
from app.core.state import AgentState
from app.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """统一聊天入口，Orchestrator 自动路由"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    session_id = request.session_id or uuid.uuid4().hex[:12]

    try:
        initial_state: AgentState = {
            "messages": [HumanMessage(content=request.message)],
            "intent": "",
            "resume_text": request.message if "简历" in request.message else None,
            "resume_analysis": None,
            "jd_text": request.message if "岗位" in request.message else None,
            "jd_analysis": None,
            "match_result": None,
            "interview_result": None,
            "current_agent": "",
            "error": None,
        }

        result = agent_workflow.invoke(initial_state)

        # 根据执行结果生成回复
        response_text = _build_response(result)
        return ChatResponse(response=response_text, session_id=session_id)

    except Exception as e:
        logger.error("Chat 处理失败: %s", e)
        raise HTTPException(status_code=500, detail=f"处理失败: {e}")


def _build_response(state: AgentState) -> str:
    """根据 Agent 执行结果构建回复文本"""
    if state.get("error"):
        return f"处理时遇到错误: {state['error']}"

    intent = state.get("intent", "general")

    if intent == "resume" and state.get("resume_analysis"):
        analysis = state["resume_analysis"]
        skills = ", ".join(analysis.get("skills", []))
        return (
            f"📄 简历分析完成\n\n"
            f"**技能**: {skills}\n"
            f"**经历**: {len(analysis.get('experience', []))} 段\n"
            f"**简介**: {analysis.get('summary', '')}"
        )

    if intent == "job" and state.get("jd_analysis"):
        jd = state["jd_analysis"]
        return (
            f"💼 岗位分析完成\n\n"
            f"**岗位**: {jd.get('title', '未知')}\n"
            f"**要求**: {chr(10).join('- ' + r for r in jd.get('requirements', []))}\n"
            f"**关键词**: {', '.join(jd.get('keywords', []))}"
        )

    if intent == "match" and state.get("match_result"):
        match = state["match_result"]
        return (
            f"🎯 匹配度分析\n\n"
            f"**匹配度**: {match.get('match_score', 0)}%\n"
            f"**匹配技能**: {', '.join(match.get('matched_skills', []))}\n"
            f"**缺失技能**: {', '.join(match.get('missing_skills', []))}\n\n"
            f"**建议**: {chr(10).join('- ' + s for s in match.get('suggestions', []))}"
        )

    if intent == "interview" and state.get("interview_result"):
        questions = state["interview_result"].get("questions", [])
        text = "🎙️ 面试题准备\n\n"
        for i, q in enumerate(questions, 1):
            text += f"{i}. [{q.get('type', '')}] {q.get('question', '')}\n"
        return text

    return "你好！我可以帮你分析简历、解析岗位描述、计算匹配度或准备面试题。请告诉我你需要什么帮助？"
```

- [ ] **Step 2: 注册 chat 路由到 main.py**

```python
from app.api.chat import router as chat_router
# 在 include_router 区域
app.include_router(chat_router)
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: add LangGraph workflow and Orchestrator agent

- Create AgentState with full type definition
- Build StateGraph with 5 nodes (orchestrator + 4 agents)
- Conditional routing based on intent classification
- /chat unified endpoint with auto-routing
- Agent results formatted as readable responses"
```

---

## 第五阶段：Memory + Streaming

### 任务 5.1：创建 Memory 模块

**Files:**
- Create: `backend/app/core/memory.py`

- [ ] **Step 1: 写入 memory.py**

```python
"""对话记忆管理"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

SESSION_DIR = Path(__file__).parents[2] / "data" / "sessions"


class SessionMemory:
    """基于文件的对话记忆管理"""

    def __init__(self):
        os.makedirs(SESSION_DIR, exist_ok=True)

    def _session_path(self, session_id: str) -> Path:
        return SESSION_DIR / f"{session_id}.json"

    def get_history(self, session_id: str) -> list[dict]:
        """获取对话历史"""
        path = self._session_path(session_id)
        if path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        return []

    def add_message(self, session_id: str, role: str, content: str):
        """添加消息到历史"""
        history = self.get_history(session_id)
        history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        with open(self._session_path(session_id), "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def clear(self, session_id: str):
        """清除对话历史"""
        path = self._session_path(session_id)
        if path.exists():
            path.unlink()

    def list_sessions(self) -> list[str]:
        """列出所有会话 ID"""
        if not SESSION_DIR.exists():
            return []
        return [f.stem for f in SESSION_DIR.iterdir() if f.suffix == ".json"]


# 全局实例
session_memory = SessionMemory()
```

- [ ] **Step 2: 创建 /chat/history 端点（更新 api/chat.py）**

在 `api/chat.py` 文件末尾添加：
```python
from app.core.memory import session_memory

@router.post("/chat/history")
async def chat_history(session_id: str):
    """获取指定会话的对话历史"""
    history = session_memory.get_history(session_id)
    return {"session_id": session_id, "messages": history}
```

### 任务 5.2：实现流式响应

**Files:**
- Modify: `backend/app/api/chat.py`

- [ ] **Step 1: 添加 SSE Streaming 端点**

```python
import json
import asyncio
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式聊天入口 (SSE)"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    session_id = request.session_id or uuid.uuid4().hex[:12]

    async def event_generator():
        yield f"event: meta\ndata: {json.dumps({'session_id': session_id})}\n\n"

        try:
            initial_state: AgentState = {
                "messages": [HumanMessage(content=request.message)],
                "intent": "",
                "resume_text": request.message if "简历" in request.message else None,
                "resume_analysis": None,
                "jd_text": request.message if "岗位" in request.message else None,
                "jd_analysis": None,
                "match_result": None,
                "interview_result": None,
                "current_agent": "",
                "error": None,
            }

            # 输出 Agent 路由信息
            yield f"event: agent\ndata: {json.dumps({'agent': 'orchestrator', 'status': 'started'})}\n\n"

            result = agent_workflow.invoke(initial_state)
            response_text = _build_response(result)

            # 模拟逐 token 输出
            for char in response_text:
                yield f"event: token\ndata: {json.dumps({'content': char})}\n\n"
                await asyncio.sleep(0.02)

            yield f"event: done\ndata: {json.dumps({'agent': result.get('current_agent', '')})}\n\n"

        except Exception as e:
            logger.error("Stream 处理失败: %s", e)
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: add session memory and SSE streaming

- SessionMemory: 基于文件的对话历史管理
- /chat/history: 获取对话历史端点
- /chat/stream: SSE 流式响应端点
- 打字机效果逐 token 输出"
```

---

## 第六阶段：工程化能力

### 任务 6.1：重试 + Fallback + 超时 + 请求 ID

**Files:**
- Create: `backend/app/utils/retry.py`
- Create: `backend/app/utils/request_id.py`
- Create: `backend/app/utils/timeout.py`

- [ ] **Step 1: 写入 utils/retry.py**

```python
"""重试装饰器"""

import asyncio
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


def with_retry(max_retries: int = 2, fallback_return: any = None):
    """Tool 调用重试装饰器

    指数退避等待（1s, 2s），失败返回 fallback 而非抛异常
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries:
                        wait = 2 ** attempt
                        logger.warning("重试 %s (第 %d 次, %ds 后重试): %s",
                                       func.__name__, attempt + 1, wait, e)
                        time.sleep(wait)
                    else:
                        logger.error("%s 重试 %d 次均失败: %s",
                                     func.__name__, max_retries, e)
            return fallback_return
        return wrapper
    return decorator
```

- [ ] **Step 2: 写入 utils/request_id.py**

```python
"""请求 ID 追踪"""

import contextvars
import uuid

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


def generate_request_id() -> str:
    """生成新请求 ID"""
    return f"req_{uuid.uuid4().hex[:12]}"


def get_request_id() -> str:
    """获取当前请求 ID"""
    return request_id_var.get()


def set_request_id(rid: str):
    """设置当前请求 ID"""
    request_id_var.set(rid)
```

- [ ] **Step 3: 写入 utils/timeout.py**

```python
"""Agent 超时控制"""

import asyncio
import logging

logger = logging.getLogger(__name__)


async def run_with_timeout(coro, timeout_seconds: int = 30, agent_name: str = "agent"):
    """给 Agent 执行加超时

    Args:
        coro: 异步协程
        timeout_seconds: 超时秒数
        agent_name: Agent 名称（日志用）

    Returns:
        执行结果，超时则返回错误 dict
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.warning("%s 执行超时 (%ds)", agent_name, timeout_seconds)
        return {"error": f"{agent_name} 处理超时，请重试"}
```

### 任务 6.2：可观测性 Callbacks

**Files:**
- Create: `backend/app/utils/tracing.py`

- [ ] **Step 1: 写入 tracing.py**

```python
"""Agent 调用追踪"""

import logging
import time
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler

from app.utils.request_id import get_request_id

logger = logging.getLogger(__name__)


class AgentTracingCallback(BaseCallbackHandler):
    """追踪 Agent 调用的耗时和 token 消耗"""

    def __init__(self):
        self.starts: dict[str, float] = {}

    def on_llm_start(self, serialized: dict, prompts: list[str], **kwargs):
        rid = get_request_id()
        self.starts[id(prompts)] = time.time()
        logger.info("[%s] LLM 调用开始: %s...", rid, prompts[0][:60] if prompts else "")

    def on_llm_end(self, response, **kwargs):
        rid = get_request_id()
        start_time = self.starts.pop(id(response.llm_output), time.time())
        duration = time.time() - start_time
        tokens = getattr(response, "llm_output", {}).get("token_usage", {})
        logger.info(
            "[%s] LLM 调用完成 (%.2fs, input=%s, output=%s)",
            rid, duration,
            tokens.get("prompt_tokens", "?"),
            tokens.get("completion_tokens", "?"),
        )

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs):
        rid = get_request_id()
        name = serialized.get("name", "chain")
        logger.info("[%s] Chain 开始: %s", rid, name)

    def on_chain_end(self, outputs: dict, **kwargs):
        rid = get_request_id()
        logger.info("[%s] Chain 完成", rid)
```

### 任务 6.3：配置分层

**Files:**
- Create: `backend/app/config/__init__.py`
- Create: `backend/app/config/settings.py`
- Create: `backend/app/config/agents.yaml`

- [ ] **Step 1: 创建 config 包，app/config/settings.py**

同 `config.py` 内容，添加更多配置项后将 `config.py` 替换为包结构，保持向后兼容。

### 任务 6.4：测试

**Files:**
- Create: `backend/tests/unit/test_pdf_parser.py`
- Create: `backend/tests/unit/test_resume_tools.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: 写入 conftest.py**

```python
"""测试共享 Fixture"""

import pytest


@pytest.fixture
def sample_resume_text():
    return "张三，Python 后端开发者，5 年经验。熟悉 FastAPI、Django、PostgreSQL。"


@pytest.fixture
def sample_jd_text():
    return "招聘 Python 后端工程师，要求熟悉 FastAPI、Docker、Kubernetes。"
```

- [ ] **Step 2: 写入 test_pdf_parser.py**

```python
"""PDF 解析单元测试"""

import pytest
from pathlib import Path
from app.services.pdf_parser import extract_text_from_pdf, PDFParserError


def test_extract_text_from_pdf_returns_string():
    """测试 PDF 解析返回字符串"""
    result = extract_text_from_pdf(Path(__file__).parents[2] / "data" / "test_resume.pdf")
    assert isinstance(result, str)


def test_extract_text_from_pdf_file_not_found():
    """测试文件不存在时抛出异常"""
    with pytest.raises(PDFParserError):
        extract_text_from_pdf("/nonexistent/file.pdf")
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: add engineering capabilities

- Retry decorator with exponential backoff
- Request ID tracking via contextvars
- Agent timeout control (asyncio.timeout)
- AgentTracingCallback for LLM call monitoring
- pytest tests for PDF parser
- Test fixtures for resume/JD samples"
```

---

## 第七阶段：前端

基于 Next.js 14 构建聊天式前端，支持流式输出和文件上传。

（详细任务见前端子计划）

---

## 第八阶段：Docker + CI/CD

### 任务 8.1：更新 Docker 配置

**Files:**
- Modify: `docker/Dockerfile`
- Modify: `docker/docker-compose.yml`

- [ ] **Step 1: 更新 Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p data/chroma data/sessions uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: 更新 docker-compose.yml**

```yaml
version: "3.8"
services:
  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ../backend/.env
    volumes:
      - ../backend/data:/app/data
      - ../backend/uploads:/app/uploads
    restart: unless-stopped
```

### 任务 8.2：GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 写入 ci.yml**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest tests/ --cov=app --cov-report=term-missing
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "ci: add Docker config and GitHub Actions CI"
```

---

## 第九阶段：文档

### 任务 9.1：ARCHITECTURE.md

**Files:**
- Create: `docs/ARCHITECTURE.md`

包含：
- 系统架构图（ASCII）
- 设计决策说明（为什么选 Orchestrator、ChromaDB、SSE 等）
- Agent 职责概览
- 数据流图
- 工程化设计说明（重试、可观测性、超时、测试）

### 任务 9.2：更新 README.md

更新为完整的项目 README，包含：
- 项目定位
- 架构图
- 技术栈
- 快速开始
- API 文档链接
- 开发路线
- 在线 Demo 链接
