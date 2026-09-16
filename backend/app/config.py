import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# 模型已本地缓存时跳过 huggingface.co 在线检查（大幅加快冷启动）
if os.getenv("HF_HUB_OFFLINE") == "1":
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
elif os.path.exists(".env"):
    with open(".env") as f:
        if any(line.strip() == "HF_HUB_OFFLINE=1" for line in f):
            os.environ["HF_HUB_OFFLINE"] = "1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    chat_model: str = "deepseek-chat"
    reasoner_model: str = "deepseek-reasoner"

    # PostgreSQL / pgvector
    pg_host: str = "localhost"
    pg_port: int = 5433
    pg_db: str = "medrag"
    pg_user: str = "meduser"
    pg_password: str = "medpass"

    # Embedding
    embed_model: str = "BAAI/bge-small-zh-v1.5"
    embed_device: str = "cpu"
    embed_query_instruction: str = "为这个句子生成表示以用于检索相关文章："

    # Retrieval
    rag_top_k: int = 5
    rag_score_threshold: float = 0.35

    @property
    def dsn(self) -> str:
        return (
            f"host={self.pg_host} port={self.pg_port} dbname={self.pg_db} "
            f"user={self.pg_user} password={self.pg_password}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
