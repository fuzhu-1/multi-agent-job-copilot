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
