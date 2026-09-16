"""文档入库管道：切分 -> bge embedding -> 写入 documents/chunks（与建库脚本同构）。"""
import re

from psycopg import sql

from app.config import get_settings
from app.rag.vectorstore import get_embeddings

settings = get_settings()

INSERT_DOC = """
INSERT INTO documents (source, source_name, source_url, title, lang, doc_metadata, raw_text)
VALUES (%(source)s, %(source_name)s, %(source_url)s, %(title)s, %(lang)s, %(doc_metadata)s, %(raw_text)s)
RETURNING id
"""
INSERT_CHUNK = """
INSERT INTO chunks (document_id, chunk_index, chunk_text, char_length, embedding)
VALUES (%s, %s, %s, %s, %s::vector)
"""


def _clean(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, size: int = 600, overlap: int = 120, min_chunk: int = 80) -> list[str]:
    text = _clean(text)
    chunks, start, i = [], 0, 0
    while start < len(text):
        end = min(start + size, len(text))
        piece = text[start:end]
        if len(piece) >= min_chunk:
            chunks.append((i, piece))
            i += 1
        if end >= len(text):
            break
        start = end - overlap
    return chunks


def ingest_document(
    raw_text: str,
    title: str,
    source: str = "upload",
    source_name: str = "用户上传",
    source_url: str = "",
    lang: str = "zh",
    metadata: dict | None = None,
) -> int:
    """入库一篇文档，返回写入的 chunk 数。"""
    chunks = chunk_text(raw_text)
    if not chunks:
        return 0
    embeddings = get_embeddings()
    vectors = embeddings.embed_documents([c[1] for c in chunks])
    with psycopg.connect(settings.dsn) as conn, conn.cursor() as cur:
        cur.execute(
            INSERT_DOC,
            {
                "source": source,
                "source_name": source_name,
                "source_url": source_url,
                "title": title,
                "lang": lang,
                "doc_metadata": metadata or {},
                "raw_text": raw_text,
            },
        )
        doc_id = cur.fetchone()[0]
        for (idx, piece), vec in zip(chunks, vectors):
            vec_str = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
            cur.execute(INSERT_CHUNK, (doc_id, idx, piece, len(piece), vec_str))
        conn.commit()
    return len(chunks)
