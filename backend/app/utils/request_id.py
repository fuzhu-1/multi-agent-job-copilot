"""请求 ID 追踪"""

import contextvars
import uuid

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


def generate_request_id() -> str:
    """生成新请求 ID"""
    return f"req_{uuid.uuid4().hex[:12]}"


def get_request_id() -> str:
    """获取当前请求 ID"""
    return request_id_var.get()


def set_request_id(rid: str):
    """设置当前请求 ID"""
    request_id_var.set(rid)
