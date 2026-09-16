from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.rag.ingest import ingest_document

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("")
async def ingest(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    source_name: str = Form(default="用户上传"),
):
    """上传 txt/markdown 文档，切分并入库 medrag（documents + chunks）。"""
    if not file.filename or not file.filename.lower().endswith((".txt", ".md", ".markdown")):
        raise HTTPException(400, "仅支持 .txt / .md 文件")
    raw = (await file.read()).decode("utf-8", errors="ignore")
    if not raw.strip():
        raise HTTPException(400, "文件内容为空")
    try:
        n = ingest_document(
            raw,
            title=title or file.filename,
            source="upload",
            source_name=source_name,
            source_url="",
            lang="zh",
        )
    except Exception as e:
        raise HTTPException(500, f"入库失败: {e}")
    return {"ok": True, "chunks": n, "title": title or file.filename}
