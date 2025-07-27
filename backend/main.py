from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import requests
import json
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ai")
async def chat(request: Request):
    body = await request.json()
    new_msg = body.get("message", "")
    history = body.get("history", [])

    # Build prompt with roles
    context = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        context += f"{role}: {msg['content']}\n"

    prompt = context + f"User: {new_msg}\nAssistant:"

    def stream():
        with requests.post(
            "https://eesyai-v3.onrender.com/api/ai",
            json={"prompt": prompt, "stream": True},
            stream=True,
        ) as r:
            for line in r.iter_lines():
                if not line or not line.startswith(b"data: "):
                    continue

                try:
                    data = json.loads(line[6:].decode("utf-8"))
                    token = data.get("content", "")
                    # Clean hallucinated formatting
                    token = token.replace("<|im_end|>", "").replace("\u001b[0m", "")
                    yield token
                except json.JSONDecodeError:
                    continue

    return StreamingResponse(stream(), media_type="text/plain")

