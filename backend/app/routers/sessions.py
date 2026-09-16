import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.db.database import get_db
from app.db.models import Message, Session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class SessionCreate(BaseModel):
    title: str = "新对话"


class SessionRename(BaseModel):
    title: str


def _to_out(s: Session) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "created_at": s.created_at.isoformat() if s.created_at else "",
        "updated_at": s.updated_at.isoformat() if s.updated_at else "",
        "message_count": len(s.messages),
    }


@router.get("")
def list_sessions(db: DbSession = Depends(get_db)):
    sessions = db.scalars(select(Session).order_by(Session.updated_at.desc())).all()
    return [_to_out(s) for s in sessions]


@router.post("")
def create_session(body: SessionCreate, db: DbSession = Depends(get_db)):
    s = Session(id=str(uuid.uuid4()), title=body.title)
    db.add(s)
    db.commit()
    return _to_out(s)


@router.patch("/{session_id}")
def rename_session(session_id: str, body: SessionRename, db: DbSession = Depends(get_db)):
    s = db.get(Session, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    s.title = body.title
    db.commit()
    return _to_out(s)


@router.delete("/{session_id}")
def delete_session(session_id: str, db: DbSession = Depends(get_db)):
    s = db.get(Session, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.get("/{session_id}/messages")
def get_messages(session_id: str, db: DbSession = Depends(get_db)):
    s = db.get(Session, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "thinking": m.thinking,
            "citations": m.citations or [],
        }
        for m in s.messages
    ]
