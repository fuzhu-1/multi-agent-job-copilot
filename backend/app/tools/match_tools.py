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
