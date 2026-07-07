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
