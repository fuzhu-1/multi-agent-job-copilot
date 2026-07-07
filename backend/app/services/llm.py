"""LLM 客户端封装"""

import logging
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    """获取 LLM 实例"""
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        temperature=temperature,
    )


def call_structured_llm(
    prompt: str,
    schema: type[BaseModel],
    temperature: float = 0.1,
) -> BaseModel:
    """调用 LLM 并返回结构化输出

    Args:
        prompt: 提示词
        schema: Pydantic 输出模型
        temperature: 温度参数

    Returns:
        结构化输出实例
    """
    llm = get_llm(temperature=temperature)
    structured = llm.with_structured_output(schema)
    result = structured.invoke(prompt)
    logger.info("LLM 调用完成，schema=%s", schema.__name__)
    return result
