"""Embedding + pgvector 检索，复用 medrag 库的 documents/chunks 自定义表结构。"""
import threading

import psycopg
from langchain_huggingface import HuggingFaceEmbeddings

from app.config import get_settings

settings = get_settings()

_embeddings = None
_lock = threading.Lock()


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        with _lock:
            if _embeddings is None:
                _embeddings = HuggingFaceEmbeddings(
                    model_name=settings.embed_model,
                    model_kwargs={"device": settings.embed_device},
                    encode_kwargs={"normalize_embeddings": True},
                )
    return _embeddings


def embed_query(text: str) -> list[float]:
    return get_embeddings().embed_query(text)


SQL_SEARCH = """
SELECT c.id, c.chunk_index, c.chunk_text,
       d.id AS document_id, d.title, d.source, d.source_name, d.source_url, d.doc_metadata,
       1 - (c.embedding <=> %s::vector) AS score
FROM chunks c
JOIN documents d ON d.id = c.document_id
ORDER BY c.embedding <=> %s::vector
LIMIT %s
"""


def search(query: str, top_k: int | None = None) -> list[dict]:
    """语义检索，返回按余弦相似度排序的块及来源信息。"""
    top_k = top_k or settings.rag_top_k
    vec = embed_query(settings.embed_query_instruction + query)
    vec_str = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
    with psycopg.connect(settings.dsn) as conn, conn.cursor() as cur:
        cur.execute(SQL_SEARCH, (vec_str, vec_str, top_k))
        cols = [d.name for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    return [r for r in rows if r["score"] >= settings.rag_score_threshold]
