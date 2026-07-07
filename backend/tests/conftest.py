"""测试共享 Fixture"""

import pytest


@pytest.fixture
def sample_resume_text():
    return "张三，Python 后端开发者，5 年经验。熟悉 FastAPI、Django、PostgreSQL、Docker、Redis。"


@pytest.fixture
def sample_jd_text():
    return "招聘 Python 后端工程师，要求熟悉 FastAPI、Docker、Kubernetes、消息队列。本科及以上学历。"
