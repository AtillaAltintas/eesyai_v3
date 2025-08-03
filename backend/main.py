from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import requests
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev/testing. Limit in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your llama-server API URL on your server (adjust if not public!)
LLAMA_API_URL = os.getenv("LLAMA_API_URL", "http://127.0.0.1:8080/completion")

@app.post("/api/ai")
async def chat(request: Request):
    body = await request.json()
    new_msg = body.get("message", "")
    history = body.get("history", [])

    # Build prompt in your desired format (simple, for now):
    context = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        context += f"{role}: {msg['content']}\n"
    prompt = context + f"User: {new_msg}\nAssistant:"

    def stream():
        with requests.post(
            LLAMA_API_URL,
            json={"prompt": prompt, "stream": True},
            stream=True,
        ) as r:
            for line in r.iter_lines():
                if not line or not line.startswith(b"data: "):
                    continue
                # Parse the OpenAI-style stream
                try:
                    import json
                    data = json.loads(line[6:].decode("utf-8"))
                    token = data.get("content", "")
                    # Remove unwanted formatting if needed
                    yield token
                except Exception:
                    continue

    return StreamingResponse(stream(), media_type="text/plain")

