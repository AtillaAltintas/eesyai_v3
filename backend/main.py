from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import os


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

    result = subprocess.run(
        ["../llama.cpp/build/bin/llama-run", "../llama.cpp/models/mistral-7b-instruct-v0.1.Q4_K_M.gguf", prompt, "-n", "100"],
        capture_output=True,
        text=True
    )

    output = result.stdout.strip()
    return {"reply": output}

