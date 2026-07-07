"""Agent 超时控制"""

import asyncio
import logging

logger = logging.getLogger(__name__)


async def run_with_timeout(coro, timeout_seconds: int = 30, agent_name: str = "agent"):
    """给 Agent 执行加超时

    Args:
        coro: 异步协程
        timeout_seconds: 超时秒数
        agent_name: Agent 名称（日志用）

    Returns:
        执行结果，超时则返回错误 dict
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.warning("%s 执行超时 (%ds)", agent_name, timeout_seconds)
        return {"error": f"{agent_name} 处理超时，请重试"}
