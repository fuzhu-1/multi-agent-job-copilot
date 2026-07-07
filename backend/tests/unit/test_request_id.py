"""请求 ID 单元测试"""

import contextvars
import threading
import uuid

import pytest

from app.utils.request_id import generate_request_id, get_request_id, request_id_var, set_request_id


def test_generate_request_id_format():
    """测试请求 ID 格式"""
    rid = generate_request_id()
    assert rid.startswith("req_")
    assert len(rid) == 4 + 12  # "req_" + 12 hex chars


def test_generate_request_id_unique():
    """测试连续生成的 ID 不重复"""
    ids = {generate_request_id() for _ in range(100)}
    assert len(ids) == 100


def test_request_id_context():
    """测试 ContextVar 设置和读取"""
    rid1 = generate_request_id()
    rid2 = generate_request_id()

    set_request_id(rid1)
    assert get_request_id() == rid1

    set_request_id(rid2)
    assert get_request_id() == rid2


def test_request_id_default_empty():
    """测试新线程中默认空字符串"""
    results = []

    def check():
        results.append(get_request_id())

    t = threading.Thread(target=check)
    t.start()
    t.join()
    assert results[0] == ""
