"""FastAPI 应用入口"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.resume import router as resume_router
from app.api.rag import router as rag_router
from app.api.chat import router as chat_router
from app.config import settings
from app.utils.request_id import generate_request_id, set_request_id

# ── 日志配置 ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
)
logger = logging.getLogger(__name__)

# ── 应用创建 ─────────────────────────────────────────────
app = FastAPI(
    title="Agentic Career Copilot",
    description="基于 LangGraph 的多 Agent 智能职业助手 API",
    version="0.2.0",
)

# ── CORS 配置（允许前端跨域访问）────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 请求 ID 中间件 ────────────────────────────────────────
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        rid = generate_request_id()
        set_request_id(rid)
        logger.info("[%s] %s %s", rid, request.method, request.url.path)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


app.add_middleware(RequestIDMiddleware)

# ── 注册路由 ─────────────────────────────────────────────
app.include_router(resume_router)
app.include_router(rag_router)
app.include_router(chat_router)


# ── 根路径 ───────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "app": "Agentic Career Copilot",
        "version": "0.2.0",
        "agents": ["resume", "job", "match", "interview"],
        "docs": "/docs",
    }


# ── 启动 ─────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=True,
    )
