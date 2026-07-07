"""简历上传与分析 API"""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.agents.match_agent import MatchAgent
from app.agents.resume_agent import ResumeAgent
from app.config import settings
from app.models.schemas import (
    AnalyzeResumeRequest,
    AnalyzeResumeResponse,
    MatchJobRequest,
    MatchJobResponse,
    ResumeUploadResponse,
)
from app.services.pdf_parser import extract_text_from_pdf, PDFParserError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["resume"])

resume_agent = ResumeAgent()
match_agent = MatchAgent()


@router.post("/upload_resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile) -> ResumeUploadResponse:
    """上传 PDF 简历并解析文本内容"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 文件格式")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(exist_ok=True)

    file_id = uuid.uuid4().hex[:8]
    save_path = upload_dir / f"{file_id}_{file.filename}"

    try:
        content = await file.read()
        save_path.write_bytes(content)
        logger.info("文件已保存: %s (%d bytes)", save_path, len(content))
    except Exception as e:
        logger.error("文件保存失败: %s", e)
        raise HTTPException(status_code=500, detail=f"文件保存失败: {e}")

    try:
        text = extract_text_from_pdf(save_path)
    except PDFParserError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return ResumeUploadResponse(filename=file.filename, text=text)


@router.post("/analyze_resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(request: AnalyzeResumeRequest) -> AnalyzeResumeResponse:
    """分析简历文本，提取结构化信息"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")

    try:
        result = resume_agent.run(resume_text=request.text)
        return result
    except Exception as e:
        logger.error("简历分析失败: %s", e)
        raise HTTPException(status_code=500, detail=f"简历分析失败: {e}")


@router.post("/match_job", response_model=MatchJobResponse)
async def match_job(request: MatchJobRequest) -> MatchJobResponse:
    """分析简历与岗位的匹配度"""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="岗位描述不能为空")

    try:
        result = match_agent.run(resume_text=request.resume_text, jd_text=request.job_description)
        return result
    except Exception as e:
        logger.error("岗位匹配失败: %s", e)
        raise HTTPException(status_code=500, detail=f"岗位匹配失败: {e}")
