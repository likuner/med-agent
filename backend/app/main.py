from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.db.models import Base
from app.routers import chat, ingest, sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)  # sessions/messages 表
    yield


app = FastAPI(title="Medical Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(ingest.router)


@app.get("/api/health")
def health():
    return {"ok": True}
