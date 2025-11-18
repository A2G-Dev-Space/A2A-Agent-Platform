#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "fastapi>=0.115.0",
#     "uvicorn[standard]>=0.32.0",
#     "langchain>=0.3.0",
#     "langchain-openai>=0.2.0",
#     "pydantic>=2.0.0",
#     "httpx>=0.27.0",
# ]
# ///
"""
Test LangChain Agent for A2A Platform
FastAPI application with invoke and stream endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import json
from typing import AsyncGenerator

# Configuration
API_KEY = "a2g_75a669be0d569905e08cf51b53ff3f8723a0027a6db653706a0a6dd8f07f5490"
TRACE_ENDPOINT = "http://localhost:9050/api/llm/trace/b8f5b410-1cf5-4b61-84e8-7a9d9f126aae/v1"
MODEL_NAME = "qwen/qwen3-14b"

app = FastAPI(
    title="Test LangChain Agent",
    description="A2A Platform test agent with invoke and stream endpoints",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9060", "http://localhost:3000"],
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


def get_llm(streaming: bool = False) -> ChatOpenAI:
    """Initialize ChatOpenAI with A2A Platform configuration"""
    return ChatOpenAI(
        model=MODEL_NAME,
        openai_api_key=API_KEY,
        openai_api_base=TRACE_ENDPOINT,
        temperature=0.7,
        streaming=streaming,
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
            llm = get_llm(streaming=True)

            messages = [
                SystemMessage(content=request.system_prompt),
                HumanMessage(content=request.input)
            ]

            # Stream the response
            async for chunk in llm.astream(messages):
                if chunk.content:
                    data = {
                        "content": chunk.content,
                        "model": MODEL_NAME,
                        "trace_id": TRACE_ENDPOINT.split("/")[-2]
                    }
                    yield f"data: {json.dumps(data)}\n\n"

            # Send done signal
            yield "data: [DONE]\n\n"

        except Exception as e:
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
