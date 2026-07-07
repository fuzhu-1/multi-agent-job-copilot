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
