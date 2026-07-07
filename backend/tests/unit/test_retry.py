"""重试装饰器单元测试"""

import pytest

from app.utils.retry import with_retry


def test_with_retry_success():
    """测试正常调用成功"""
    call_count = 0

    @with_retry(max_retries=2, fallback_return=None)
    def success_func():
        nonlocal call_count
        call_count += 1
        return "ok"

    result = success_func()
    assert result == "ok"
    assert call_count == 1


def test_with_retry_fallback():
    """测试失败后返回 fallback 值"""
    call_count = 0

    @with_retry(max_retries=2, fallback_return="fallback")
    def fail_func():
        nonlocal call_count
        call_count += 1
        raise ValueError("test error")

    result = fail_func()
    assert result == "fallback"
    assert call_count == 3  # 1 次原始 + 2 次重试


def test_with_retry_success_after_retry():
    """测试重试一次后成功"""
    call_count = 0

    @with_retry(max_retries=2, fallback_return=None)
    def eventually_ok():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise ValueError("not yet")
        return "ok"

    result = eventually_ok()
    assert result == "ok"
    assert call_count == 2
