"""LangGraph 工作流定义"""

import logging

from langgraph.graph import END, StateGraph

from app.agents.interview_agent import InterviewAgent
from app.agents.job_agent import JobAgent
from app.agents.match_agent import MatchAgent
from app.agents.resume_agent import ResumeAgent
from app.core.state import AgentState

logger = logging.getLogger(__name__)

resume_agent = ResumeAgent()
job_agent = JobAgent()
match_agent = MatchAgent()
interview_agent = InterviewAgent()


def orchestrator_node(state: AgentState) -> dict:
    """Orchestrator 节点：判断意图"""
    user_message = state["messages"][-1].content.lower() if state["messages"] else ""

    intent = "general"
    if any(kw in user_message for kw in ["简历", "resume", "上传", "pdf"]):
        intent = "resume"
    elif any(kw in user_message for kw in ["岗位", "职位", "jd", "job", "招聘"]):
        intent = "job"
    elif any(kw in user_message for kw in ["匹配", "match", "对比", "适合"]):
        intent = "match"
    elif any(kw in user_message for kw in ["面试", "interview", "题目", "问题"]):
        intent = "interview"

    logger.info("Orchestrator 意图分类: %s", intent)
    return {"intent": intent, "current_agent": intent}


def resume_node(state: AgentState) -> dict:
    """Resume Agent 节点"""
    text = state.get("resume_text") or (state["messages"][-1].content if state["messages"] else "")
    try:
        result = resume_agent.run(resume_text=text)
        return {"resume_analysis": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("ResumeAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def job_node(state: AgentState) -> dict:
    """Job Agent 节点"""
    text = state.get("jd_text") or (state["messages"][-1].content if state["messages"] else "")
    try:
        result = job_agent.run(text)
        return {"jd_analysis": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("JobAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def match_node(state: AgentState) -> dict:
    """Match Agent 节点"""
    resume = state.get("resume_text") or ""
    jd = state.get("jd_text") or ""
    try:
        result = match_agent.run(resume, jd)
        return {"match_result": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("MatchAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def interview_node(state: AgentState) -> dict:
    """Interview Agent 节点"""
    resume = state.get("resume_text") or ""
    jd = state.get("jd_text")
    try:
        result = interview_agent.run(resume, jd)
        return {"interview_result": result.model_dump(), "current_agent": "orchestrator"}
    except Exception as e:
        logger.error("InterviewAgent 执行失败: %s", e)
        return {"error": str(e), "current_agent": "orchestrator"}


def router_condition(state: AgentState) -> str:
    """条件边：根据 intent 路由"""
    if state.get("error"):
        return "end"
    return state.get("intent", "general")


def build_workflow() -> StateGraph:
    """构建 LangGraph 工作流"""
    workflow = StateGraph(AgentState)

    # 注册节点
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("resume", resume_node)
    workflow.add_node("job", job_node)
    workflow.add_node("match", match_node)
    workflow.add_node("interview", interview_node)

    # 设置入口
    workflow.set_entry_point("orchestrator")

    # 条件边
    workflow.add_conditional_edges(
        "orchestrator",
        router_condition,
        {
            "resume": "resume",
            "job": "job",
            "match": "match",
            "interview": "interview",
            "general": END,
            "end": END,
        },
    )

    # 子 Agent 完成后返回
    for agent in ["resume", "job", "match", "interview"]:
        workflow.add_edge(agent, END)

    return workflow.compile()


# 全局工作流实例
agent_workflow = build_workflow()
