"""RAG 检索服务"""

import logging
import uuid

from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

try:
    store = VectorStore()
except Exception as e:
    logger.error("向量数据库初始化失败: %s", e)
    store = None


def _get_store() -> VectorStore:
    """获取 VectorStore 实例，延迟初始化"""
    global store
    if store is None:
        try:
            store = VectorStore()
        except Exception as e:
            logger.error("向量数据库初始化失败: %s", e)
            raise RuntimeError(f"向量数据库不可用: {e}")
    return store


def add_to_knowledge_base(text: str, metadata: dict | None = None) -> str:
    """添加文档到知识库"""
    doc_id = uuid.uuid4().hex[:12]
    _get_store().add_documents(
        ids=[doc_id],
        texts=[text],
        metadatas=[metadata or {"source": "manual"}],
    )
    return doc_id


def search_knowledge_base(query: str, k: int = 5) -> list[dict]:
    """检索知识库"""
    return _get_store().similarity_search(query, k=k)
