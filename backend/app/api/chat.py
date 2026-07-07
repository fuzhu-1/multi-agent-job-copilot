"""聊天 API — 统一入口"""

import logging
import uuid

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage

from app.core.workflow import agent_workflow
from app.core.state import AgentState
from app.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["chat"])

# 常量，用于 f-string 中避免反斜杠限制
NEWLINE = "\n"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """统一聊天入口，Orchestrator 自动路由"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    session_id = request.session_id or uuid.uuid4().hex[:12]

    try:
        initial_state: AgentState = {
            "messages": [HumanMessage(content=request.message)],
            "intent": "",
            "resume_text": None,
            "resume_analysis": None,
            "jd_text": None,
            "jd_analysis": None,
            "match_result": None,
            "interview_result": None,
            "current_agent": "",
            "error": None,
        }

        result = agent_workflow.invoke(initial_state)

        # 根据执行结果生成回复
        response_text = _build_response(result)
        return ChatResponse(response=response_text, session_id=session_id)

    except Exception as e:
        logger.error("Chat 处理失败: %s", e)
        raise HTTPException(status_code=500, detail="处理失败，请稍后重试")


def _build_response(state: AgentState) -> str:
    """根据 Agent 执行结果构建回复文本"""
    if state.get("error"):
        return f"处理时遇到错误: {state['error']}"

    intent = state.get("intent", "general")

    if intent == "resume" and state.get("resume_analysis"):
        analysis = state.get("resume_analysis", {})
        skills = ", ".join(analysis.get("skills", []))
        return (
            f"📄 简历分析完成\n\n"
            f"**技能**: {skills}\n"
            f"**经历**: {len(analysis.get('experience', []))} 段\n"
            f"**简介**: {analysis.get('summary', '')}"
        )

    if intent == "job" and state.get("jd_analysis"):
        jd = state.get("jd_analysis", {})
        req_list = NEWLINE.join("- " + r for r in jd.get("requirements", []))
        return (
            f"💼 岗位分析完成\n\n"
            f"**岗位**: {jd.get('title', '未知')}\n"
            f"**要求**: {req_list}\n"
            f"**关键词**: {', '.join(jd.get('keywords', []))}"
        )

    if intent == "match" and state.get("match_result"):
        match = state.get("match_result", {})
        sug_list = NEWLINE.join("- " + s for s in match.get("suggestions", []))
        return (
            f"🎯 匹配度分析\n\n"
            f"**匹配度**: {match.get('match_score', 0)}%\n"
            f"**匹配技能**: {', '.join(match.get('matched_skills', []))}\n"
            f"**缺失技能**: {', '.join(match.get('missing_skills', []))}\n\n"
            f"**建议**: {sug_list}"
        )

    if intent == "interview" and state.get("interview_result"):
        questions = state.get("interview_result", {}).get("questions", [])
        text = "🎙️ 面试题准备\n\n"
        for i, q in enumerate(questions, 1):
            text += f"{i}. [{q.get('type', '')}] {q.get('question', '')}\n"
        return text

    return "你好！我可以帮你分析简历、解析岗位描述、计算匹配度或准备面试题。请告诉我你需要什么帮助？"
