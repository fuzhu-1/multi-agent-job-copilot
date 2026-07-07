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
