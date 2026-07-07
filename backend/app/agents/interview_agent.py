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
