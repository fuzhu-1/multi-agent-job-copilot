"""重试装饰器（同步版）

注意：使用 time.sleep 阻塞等待，仅在同步上下文中使用。
如在 async 环境中调用，请通过 asyncio.to_thread 隔离。
"""

import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


def with_retry(max_retries: int = 2, fallback_return: any = None):
    """Tool 调用重试装饰器

    指数退避等待（1s, 2s），失败返回 fallback 而非抛异常

    注意：此装饰器使用 time.sleep（同步阻塞），
    在 async 环境中请通过 asyncio.to_thread 调用。
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries:
                        wait = 2 ** attempt
                        logger.warning("重试 %s (第 %d 次, %ds 后重试): %s",
                                       func.__name__, attempt + 1, wait, e)
                        time.sleep(wait)
                    else:
                        logger.error("%s 重试 %d 次均失败: %s",
                                     func.__name__, max_retries, e)
            return fallback_return
        return wrapper
    return decorator
