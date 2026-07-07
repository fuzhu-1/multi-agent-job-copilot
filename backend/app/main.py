"""FastAPI 应用入口"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.resume import router as resume_router
from app.config import settings

# ── 日志配置 ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
)
logger = logging.getLogger(__name__)

# ── 应用创建 ─────────────────────────────────────────────
app = FastAPI(
    title="Multi-Agent Job Copilot",
    description="基于 LLM 的多 Agent 智能求职助手 API",
    version="0.1.0",
)

# ── CORS 配置（允许前端跨域访问）────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ─────────────────────────────────────────────
app.include_router(resume_router)


# ── 根路径 ───────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "app": "Multi-Agent Job Copilot",
        "version": "0.1.0",
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
