# backend/main.py

import os

import os
from dotenv import load_dotenv

# 1a) Compute path to THIS file’s directory
here = os.path.dirname(__file__)

# 1b) Explicitly point to backend/.env
env_path = os.path.join(here, ".env")

# 1c) Load it (override any existing vars)
load_dotenv(env_path, override=True)

# 1d) Now read SECRET_KEY
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(f"❌ SECRET_KEY not loaded! looked in: {env_path}")


import uuid
import json
import requests
from io import StringIO
from datetime import datetime, timedelta

from dotenv import load_dotenv


from fastapi import (
    FastAPI,
    Request,
    HTTPException,
    Depends,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from models import Base, User
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

# ─── Load config ──────────────────────────────────────────────────────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./db.sqlite3")
SECRET_KEY   = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set in .env")

# ─── Database setup ───────────────────────────────────────────────────────────
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ─── App & CORS ────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
      "http://localhost:3000",
      "https://eesyai-v3.onrender.com",
      "https://eesyai.vercel.app",
      "https://www.eesyai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Create tables on startup ─────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ─── OAuth2 scheme ────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# ─── Auth routes ──────────────────────────────────────────────────────────────
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Check existing user
    result = await db.execute(select(User).where(User.email == form.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    # Create new user
    user = User(
        email=form.username,
        hashed_password=hash_password(form.password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return {"msg": "User created"}

@app.post("/auth/token")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    # Issue JWT
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=1)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ─── Dependency to get current user ────────────────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user_id = payload["sub"]
    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    return user

# ─── Protected AI endpoint ────────────────────────────────────────────────────
@app.post("/api/ai")
async def chat(request: Request):
    body    = await request.json()
    new_msg = body.get("message", "")
    history = body.get("history", [])

    # build prompt…
    system_instruction = (
        "You are a helpful, multilingual assistant. "
        "Answer concisely in whichever language the user writes, "
        "and stop—do not ask any follow-up questions."
    )
    prompt_lines = [system_instruction, ""]
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        prompt_lines.append(f"{role}: {msg['content']}")
    prompt_lines.append(f"User: {new_msg}")
    prompt_lines.append("Assistant:")
    prompt = "\n".join(prompt_lines)

    def stream():
        with requests.post(
            "http://localhost:8080/completion",
            json={"prompt": prompt, "stream": True},
            headers={"Accept-Encoding": "identity"},
            stream=True,
        ) as resp:
            for line in resp.iter_lines():
                if not line or not line.startswith(b"data: "):
                    continue
                raw = line[len(b"data: "):].decode("utf-8")
                try:
                    chunk = json.loads(raw).get("content", "")
                except json.JSONDecodeError:
                    continue
                # clean tokens
                chunk = chunk.replace("<|im_end|>", "").replace("\u001b[0m", "")
                # **Immediately yield every piece**
                yield chunk

    return StreamingResponse(stream(), media_type="text/plain")


