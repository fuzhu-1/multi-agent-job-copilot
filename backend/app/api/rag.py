"""RAG 知识库 API"""

import logging

from fastapi import APIRouter, HTTPException

from app.rag.retriever import add_to_knowledge_base, search_knowledge_base
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rag", tags=["rag"])


class RAGUploadRequest(BaseModel):
    text: str = Field(description="文档内容")
    source: str = Field(default="manual", description="来源")


class RAGQueryRequest(BaseModel):
    query: str = Field(description="查询文本")
    k: int = Field(default=5, ge=1, le=20, description="返回结果数")


@router.post("/upload")
async def upload_document(request: RAGUploadRequest):
    """上传文档到 RAG 知识库"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="文档内容不能为空")
    try:
        doc_id = add_to_knowledge_base(request.text, {"source": request.source})
    except Exception as e:
        logger.error("文档添加失败: %s", e)
        raise HTTPException(status_code=500, detail="文档添加失败，请稍后重试")
    return {"id": doc_id, "message": "文档已添加"}


@router.post("/query")
async def query_knowledge(request: RAGQueryRequest):
    """检索 RAG 知识库"""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="查询内容不能为空")
    try:
        results = search_knowledge_base(request.query, k=request.k)
    except Exception as e:
        logger.error("知识库查询失败: %s", e)
        raise HTTPException(status_code=500, detail="知识库查询失败，请稍后重试")
    return {"results": results}
