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
