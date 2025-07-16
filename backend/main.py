from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import subprocess
import json
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ai")
async def chat(request: Request):
    body = await request.json()
    prompt = body.get("message", "")

    def stream():
        with requests.post(
            "http://localhost:8080/completion",
            json={"prompt": prompt, "stream": True},
            stream=True,
        ) as r:
            for line in r.iter_lines():
                if line and line.startswith(b"data: "):
                    content = line[6:].decode("utf-8")
                    try:
                        json_data = json.loads(content)
                        yield json_data.get("content", "")
                    except:
                        continue

    return StreamingResponse(stream(), media_type="text/plain")

