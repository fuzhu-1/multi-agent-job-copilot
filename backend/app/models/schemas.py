"""Pydantic 数据模型定义"""

from pydantic import BaseModel, Field


# ── 简历相关 ─────────────────────────────────────────────

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


class AnalyzeResumeResponse(BaseModel):
    """简历分析结果"""
    skills: list[str] = Field(description="技能列表")
    education: EducationItem | None = None
    experience: list[ExperienceItem] = Field(
        default_factory=list, description="工作经历列表"
    )
    summary: str = Field(default="", description="个人简介")


# ── 岗位匹配相关 ─────────────────────────────────────────

class AnalyzeResumeRequest(BaseModel):
    """简历分析请求"""
    text: str = Field(description="简历文本")


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
