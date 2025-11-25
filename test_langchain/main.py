#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "fastapi>=0.115.0",
#     "uvicorn[standard]>=0.32.0",
#     "langchain>=0.3.0",
#     "langchain-litellm>=0.1.0",
#     "litellm>=1.0.0",
#     "pydantic>=2.0.0",
#     "httpx>=0.27.0",
#     "certifi>=2023.0.0",
# ]
# ///
"""
Test LangChain Agent for A2A Platform
FastAPI application with invoke and stream endpoints using LiteLLM
"""

import os
import ssl
import certifi
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_litellm import ChatLiteLLM
from langchain_core.messages import HumanMessage, SystemMessage
import json
from typing import AsyncGenerator

# Disable SSL verification for self-signed certificates
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['SSL_VERIFY'] = 'false'

# Configure litellm to skip SSL verification
import litellm
litellm.verify_ssl = False

# Configuration
API_KEY = "a2g_69106c81492fd061f68e2d98fbc47b9ce4ee1477ee050a3b1b8fdc7bc2d5b082"
TRACE_ENDPOINT = "https://172.26.110.192:9050/api/llm/trace/97416bd5-8d32-47ab-a0da-1990bba5e5cd/v1"
MODEL_NAME = "openai/gpt-oss-20b"

app = FastAPI(
    title="Test LangChain Agent",
    description="A2A Platform test agent with invoke and stream endpoints",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9060",
        "http://localhost:3000",
        "http://172.26.110.192:9060",
        "https://172.26.110.192:9050",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    input: str  # Changed from 'message' to match Input Schema {"input": "{{message}}"}
    system_prompt: str = "You are a helpful AI assistant."

class ChatResponse(BaseModel):
    response: str
    model: str
    trace_id: str


def get_llm(streaming: bool = False) -> ChatLiteLLM:
    """Initialize ChatLiteLLM with A2A Platform configuration"""
    # Set environment variables for LiteLLM
    os.environ['OPENAI_API_BASE'] = TRACE_ENDPOINT
    os.environ['LITELLM_API_KEY'] = API_KEY

    return ChatLiteLLM(
        model=MODEL_NAME,
        api_key=API_KEY,
        api_base=TRACE_ENDPOINT,
        temperature=0.7,
        streaming=streaming,
        verify=False,  # Disable SSL verification
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Test LangChain Agent",
        "endpoints": {
            "invoke": "/invoke",
            "stream": "/stream",
            "health": "/"
        },
        "configuration": {
            "model": MODEL_NAME,
            "trace_endpoint": TRACE_ENDPOINT
        }
    }


@app.post("/invoke", response_model=ChatResponse)
async def invoke(request: ChatRequest):
    """
    Standard invoke endpoint - returns complete response
    """
    try:
        llm = get_llm(streaming=False)

        messages = [
            SystemMessage(content=request.system_prompt),
            HumanMessage(content=request.input)
        ]

        response = await llm.ainvoke(messages)

        # Extract trace ID from endpoint
        trace_id = TRACE_ENDPOINT.split("/")[-2]

        return ChatResponse(
            response=response.content,
            model=MODEL_NAME,
            trace_id=trace_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error invoking LLM: {str(e)}")


@app.post("/stream")
async def stream(request: ChatRequest):
    """
    Streaming endpoint - returns SSE stream
    """
    async def generate() -> AsyncGenerator[str, None]:
        try:
            import time
            import asyncio

            print(f"\n[Langchain Agent] Stream request received at {time.time()}")
            print(f"[Langchain Agent] Input: {request.input[:100]}...")

            llm = get_llm(streaming=True)

            messages = [
                SystemMessage(content=request.system_prompt),
                HumanMessage(content=request.input)
            ]

            # Stream the response
            chunk_count = 0
            total_content = ""
            start_time = time.time()
            last_chunk_time = start_time

            print(f"[Langchain Agent] Starting to stream from LLM...")
            async for chunk in llm.astream(messages):
                chunk_count += 1
                current_time = time.time()
                time_since_last = current_time - last_chunk_time

                if chunk.content:
                    total_content += chunk.content
                    print(f"[Langchain Agent] Chunk #{chunk_count} at {current_time:.3f} (+{time_since_last:.3f}s): '{chunk.content}' ({len(chunk.content)} chars)")

                    data = {
                        "content": chunk.content,
                        "model": MODEL_NAME,
                        "trace_id": TRACE_ENDPOINT.split("/")[-2]
                    }
                    sse_line = f"data: {json.dumps(data)}\n\n"
                    print(f"[Langchain Agent] Yielding SSE line: {sse_line[:100]}...")
                    yield sse_line

                    # Force flush to ensure immediate sending
                    await asyncio.sleep(0)  # Yield control to allow event loop to send data

                    last_chunk_time = current_time
                else:
                    print(f"[Langchain Agent] Chunk #{chunk_count} at {current_time:.3f}: Empty content")

            # Send done signal
            total_time = time.time() - start_time
            print(f"[Langchain Agent] Stream complete: {chunk_count} chunks, {len(total_content)} chars, {total_time:.2f}s")
            print(f"[Langchain Agent] Sending [DONE] signal")
            yield "data: [DONE]\n\n"

        except Exception as e:
            print(f"[Langchain Agent] Error during streaming: {e}")
            import traceback
            traceback.print_exc()
            error_data = {"error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "trace_endpoint": TRACE_ENDPOINT,
        "api_key_configured": bool(API_KEY)
    }


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🚀 Starting Test LangChain Agent for A2A Platform")
    print("=" * 60)
    print(f"📍 Server: http://0.0.0.0:6040")
    print(f"📚 API Docs: http://localhost:6040/docs")
    print(f"🔍 Model: {MODEL_NAME}")
    print(f"📊 Trace ID: {TRACE_ENDPOINT.split('/')[-2]}")
    print("=" * 60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=6040,
        log_level="info"
    )
