"""对话记忆管理"""

import json
import logging
import os
import threading
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

SESSION_DIR = Path(__file__).parents[2] / "data" / "sessions"


class SessionMemory:
    """基于文件的对话记忆管理"""

    def __init__(self):
        os.makedirs(SESSION_DIR, exist_ok=True)
        self._locks: dict[str, threading.Lock] = {}
        self._lock_lock = threading.Lock()

    def _get_lock(self, session_id: str) -> threading.Lock:
        """获取会话级别的锁，避免并发写入竞态"""
        with self._lock_lock:
            if session_id not in self._locks:
                self._locks[session_id] = threading.Lock()
            return self._locks[session_id]

    def _session_path(self, session_id: str) -> Path:
        return SESSION_DIR / f"{session_id}.json"

    def get_history(self, session_id: str) -> list[dict]:
        """获取对话历史"""
        path = self._session_path(session_id)
        if path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        return []

    def add_message(self, session_id: str, role: str, content: str):
        """添加消息到历史"""
        with self._get_lock(session_id):
            history = self.get_history(session_id)
            history.append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat(),
            })
            with open(self._session_path(session_id), "w", encoding="utf-8") as f:
                json.dump(history, f, ensure_ascii=False, indent=2)

    def clear(self, session_id: str):
        """清除对话历史"""
        path = self._session_path(session_id)
        if path.exists():
            path.unlink()

    def list_sessions(self) -> list[str]:
        """列出所有会话 ID"""
        if not SESSION_DIR.exists():
            return []
        return [f.stem for f in SESSION_DIR.iterdir() if f.suffix == ".json"]


# 全局实例
session_memory = SessionMemory()
