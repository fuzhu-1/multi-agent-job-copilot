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
