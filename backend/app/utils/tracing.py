"""Agent 调用追踪"""

import logging
import time
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler

from app.utils.request_id import get_request_id

logger = logging.getLogger(__name__)


class AgentTracingCallback(BaseCallbackHandler):
    """追踪 Agent 调用的耗时和 token 消耗"""

    def __init__(self):
        self.starts: dict[str, float] = {}

    def on_llm_start(self, serialized: dict, prompts: list[str], **kwargs):
        """LLM 调用开始时记录时间"""
        run_id = str(kwargs.get("run_id", ""))
        rid = get_request_id()
        self.starts[run_id] = time.time()
        logger.info("[%s] LLM 调用开始: %s...", rid, prompts[0][:60] if prompts else "")

    def on_llm_end(self, response, **kwargs):
        """LLM 调用结束时记录耗时和 token"""
        run_id = str(kwargs.get("run_id", ""))
        rid = get_request_id()
        start_time = self.starts.pop(run_id, time.time())
        duration = time.time() - start_time

        llm_output = getattr(response, "llm_output", None) or {}
        tokens = llm_output.get("token_usage", {})
        prompt_tokens = tokens.get("prompt_tokens", tokens.get("input_tokens", "?"))
        completion_tokens = tokens.get("completion_tokens", tokens.get("output_tokens", "?"))

        logger.info(
            "[%s] LLM 调用完成 (%.2fs, input=%s, output=%s)",
            rid, duration, prompt_tokens, completion_tokens,
        )

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs):
        """Chain 开始时记录"""
        rid = get_request_id()
        name = serialized.get("name", "chain")
        logger.info("[%s] Chain 开始: %s", rid, name)

    def on_chain_end(self, outputs: dict, **kwargs):
        """Chain 结束时记录"""
        rid = get_request_id()
        logger.info("[%s] Chain 完成", rid)

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs):
        """Tool 调用时记录"""
        rid = get_request_id()
        name = serialized.get("name", "tool")
        logger.info("[%s] Tool 调用: %s", rid, name)

    def on_tool_end(self, output: str, **kwargs):
        """Tool 调用结束"""
        rid = get_request_id()
        logger.info("[%s] Tool 调用完成", rid)
