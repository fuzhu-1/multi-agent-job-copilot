"""应用配置"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，从环境变量读取"""

    # LLM 配置
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"

    # 服务配置
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # 上传配置
    upload_dir: str = "uploads"

    # Agent 配置
    agent_timeout: int = 30
    max_retries: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
