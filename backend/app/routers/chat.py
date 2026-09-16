"""SSE 流式聊天接口。

事件协议:
  event: session        data: {session_id, title}
  event: thinking       data: {content}          # deepseek-reasoner 推理增量
  event: retrieved_docs data: {citations:[...]}  # RAG 引用
  event: token          data: {content}          # 正文增量
  event: done           data: {message_id}
  event: error          data: {message}
"""
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.db.database import get_db
from app.db.models import Message, Session
from app.graph import medical_agent
from app.graph.medical_agent import _make_llm, build_answer_messages

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    deep_think: bool = False


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
def chat(req: ChatRequest, db: DbSession = Depends(get_db)):
    import uuid

    def gen():
        # 1. 会话定位/创建
        if req.session_id:
            session = db.get(Session, req.session_id)
            if not session:
                yield _sse("error", {"message": "session not found"})
                return
        else:
            session = Session(id=str(uuid.uuid4()), title=req.message[:30] or "新对话")
            db.add(session)
            db.commit()
        yield _sse("session", {"session_id": session.id, "title": session.title})

        # 2. 取历史消息（不含本次输入）
        history = [
            HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
            for m in session.messages
        ]

        # 3. LangGraph: 路由 + 检索
        result = medical_agent.agent.graph.invoke(
            {"question": req.message, "deep_think": req.deep_think}, {"recursion_limit": 10}
        )
        citations = result.get("citations") or []
        if citations:
            yield _sse("retrieved_docs", {"citations": citations})

        # 4. 流式生成
        user_msg = Message(session_id=session.id, role="user", content=req.message)
        db.add(user_msg)
        db.commit()

        llm = _make_llm(req.deep_think)
        msgs = build_answer_messages(result, history + [HumanMessage(content=req.message)])

        answer_parts: list[str] = []
        thinking_parts: list[str] = []
        saved = False

        def persist():
            if saved or not answer_parts:
                return
            db.add(
                Message(
                    session_id=session.id,
                    role="assistant",
                    content="".join(answer_parts),
                    thinking="".join(thinking_parts),
                    citations=citations,
                )
            )
            db.commit()

        try:
            for chunk in llm.stream(msgs):
                if not isinstance(chunk, AIMessage):
                    continue
                if chunk.content:
                    answer_parts.append(chunk.content)
                    yield _sse("token", {"content": chunk.content})
                # deepseek-reasoner 的思维链（OpenAI 兼容字段 reasoning_content）
                rc = getattr(chunk, "additional_kwargs", {}).get("reasoning_content", "")
                if rc:
                    thinking_parts.append(rc)
                    yield _sse("thinking", {"content": rc})
        except Exception as e:
            yield _sse("error", {"message": f"生成失败: {e}"})
        finally:
            # 客户端中断（停止生成）或正常结束时都持久化已生成内容
            try:
                persist()
            except Exception:
                pass

        yield _sse("done", {"message_id": None})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
