"""PDF 解析单元测试"""

import pytest
from pathlib import Path

from app.services.pdf_parser import extract_text_from_pdf, PDFParserError


def test_extract_text_from_pdf_file_not_found():
    """测试文件不存在时抛出异常"""
    with pytest.raises(PDFParserError):
        extract_text_from_pdf("/nonexistent/file.pdf")


def test_extract_text_from_pdf_empty_path():
    """测试空路径返回空字符串而非异常"""
    result = extract_text_from_pdf("")
    assert result == ""
