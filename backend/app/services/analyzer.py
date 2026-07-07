"""LLM 简历分析服务"""

import json
import logging
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


class LLMExperienceItem(BaseModel):
    """LLM 输出的工作经历"""
    company: str = Field(default="")
    position: str = Field(default="")
    duration: str = Field(default="")
    description: list[str] = Field(default_factory=list)


class LLMEducationItem(BaseModel):
    """LLM 输出的教育经历"""
    school: str = Field(default="")
    degree: str = Field(default="")
    major: str = Field(default="")
    duration: str = Field(default="")


class LLMAnalyzeResult(BaseModel):
    """LLM 结构化输出"""
    skills: list[str]
    education: LLMEducationItem | None = None
    experience: list[LLMExperienceItem] = []
    summary: str = ""


class LLMMatchResult(BaseModel):
    """LLM 匹配结果"""
    match_score: float = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    suggestions: list[str]
    analysis: str


def _get_llm() -> ChatOpenAI:
    """获取 LLM 实例"""
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        temperature=0.1,
    )


def analyze_resume_with_llm(text: str) -> dict[str, Any]:
    """调用 LLM 分析简历，返回结构化结果

    Args:
        text: 简历文本

    Returns:
        包含 skills, education, experience, summary 的字典
    """
    llm = _get_llm()
    structured_llm = llm.with_structured_output(LLMAnalyzeResult)

    prompt = (
        "你是一位专业的 HR 分析师。请从以下简历文本中提取结构化信息。\n\n"
        f"简历文本：\n{text}\n\n"
        "请提取：\n"
        "1. skills：候选人的技能列表（技术栈、语言、工具等）\n"
        "2. education：教育经历（学校、学位、专业、时间）\n"
        "3. experience：工作经历（公司、职位、时间、职责描述）\n"
        "4. summary：个人简介摘要（2-3句话）"
    )

    try:
        result: LLMAnalyzeResult = structured_llm.invoke(prompt)
        logger.info("简历分析完成，提取到 %d 项技能、%d 段经历",
                     len(result.skills), len(result.experience))
        return result.model_dump()
    except Exception as e:
        logger.error("LLM 分析失败: %s", e)
        raise


def match_resume_with_jd(resume_text: str, jd_text: str) -> dict[str, Any]:
    """调用 LLM 分析简历与岗位的匹配度

    Args:
        resume_text: 简历文本
        jd_text: 岗位描述文本

    Returns:
        包含 match_score, matched_skills, missing_skills, suggestions, analysis 的字典
    """
    llm = _get_llm()
    structured_llm = llm.with_structured_output(LLMMatchResult)

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

    try:
        result: LLMMatchResult = structured_llm.invoke(prompt)
        logger.info("岗位匹配完成，匹配度: %.1f%%", result.match_score)
        return result.model_dump()
    except Exception as e:
        logger.error("LLM 匹配失败: %s", e)
        raise
