"""PDF 解析服务"""

import logging
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class PDFParserError(Exception):
    """PDF 解析异常"""


def extract_text_from_pdf(file_path: str | Path) -> str:
    """使用 PyMuPDF 提取 PDF 文本内容

    Args:
        file_path: PDF 文件路径

    Returns:
        提取到的纯文本内容

    Raises:
        PDFParserError: 解析失败时抛出
    """
    try:
        doc = fitz.open(file_path)
        pages = []
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text()
            if text.strip():
                pages.append(f"--- 第 {page_num} 页 ---\n{text}")

        doc.close()
        result = "\n\n".join(pages)

        if not result.strip():
            logger.warning("PDF 文件未提取到文本内容: %s", file_path)
            return ""

        logger.info("成功提取 %d 页文本，共 %d 字符", len(pages), len(result))
        return result

    except FileNotFoundError:
        logger.error("PDF 文件不存在: %s", file_path)
        raise PDFParserError(f"文件不存在: {file_path}")
    except fitz.FileDataError as e:
        logger.error("PDF 文件损坏: %s", e)
        raise PDFParserError(f"PDF 文件格式错误: {e}")
    except Exception as e:
        logger.error("PDF 解析异常: %s", e)
        raise PDFParserError(f"PDF 解析失败: {e}")
