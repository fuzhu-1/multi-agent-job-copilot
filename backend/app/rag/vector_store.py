"""ChromaDB 向量数据库封装"""

import logging
import os
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parents[2] / "data" / "chroma"


class VectorStore:
    """ChromaDB 向量数据库封装"""

    def __init__(self, collection_name: str = "knowledge_base"):
        os.makedirs(CHROMA_DIR, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("向量数据库已初始化: %s/%s", CHROMA_DIR, collection_name)

    def add_documents(self, ids: list[str], texts: list[str], metadatas: list[dict] | None = None):
        """添加文档到向量库"""
        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas or [{}] * len(texts),
        )
        logger.info("已添加 %d 条文档到向量库", len(texts))

    def similarity_search(self, query: str, k: int = 5) -> list[dict]:
        """相似度检索"""
        results = self.collection.query(
            query_texts=[query],
            n_results=k,
        )
        docs = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                docs.append({
                    "text": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                })
        return docs
