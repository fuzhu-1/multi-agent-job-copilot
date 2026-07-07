"""LangGraph State 定义"""

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """LangGraph 全局状态"""
    messages: Annotated[list, add_messages]
    intent: str                     # Orchestrator 分类: resume | job | match | interview | general
    resume_text: str | None
    resume_analysis: dict | None
    jd_text: str | None
    jd_analysis: dict | None
    match_result: dict | None
    interview_result: dict | None
    current_agent: str
    error: str | None
