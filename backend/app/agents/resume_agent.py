"""Resume Agent — 简历分析专家"""

import logging

from app.models.schemas import AnalyzeResumeResponse
from app.tools.resume_tools import analyze_resume_text, parse_pdf

logger = logging.getLogger(__name__)


class ResumeAgent:
    """负责简历上传、解析和结构化分析"""

    def __init__(self):
        self.name = "resume_agent"

    def run(self, resume_text: str | None = None, file_path: str | None = None) -> AnalyzeResumeResponse:
        """执行简历分析

        Args:
            resume_text: 已有简历文本（可选）
            file_path: PDF 文件路径（可选）

        Returns:
            结构化简历分析结果
        """
        text = resume_text
        if file_path and not text:
            logger.info("从 PDF 解析文本: %s", file_path)
            text = parse_pdf(file_path)

        if not text:
            raise ValueError("无简历文本可分析")

        logger.info("ResumeAgent 开始分析简历 (%d 字符)", len(text))
        result = analyze_resume_text(text)
        logger.info("ResumeAgent 分析完成: %d 项技能, %d 段经历",
                     len(result.skills), len(result.experience))
        return result
