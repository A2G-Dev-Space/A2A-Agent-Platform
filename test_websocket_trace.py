#!/usr/bin/env python3
"""
Test script for LLM Proxy WebSocket trace endpoint
"""
import asyncio
import websockets
import json

async def test_trace_websocket():
    """Test WebSocket connection to trace endpoint"""
    agent_id = "test-agent-1"
    uri = f"ws://localhost:8006/ws/trace/{agent_id}"

    print(f"🔗 Connecting to {uri}...")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")

            # Receive connection message
            message = await websocket.recv()
            data = json.loads(message)
            print(f"📨 Received: {json.dumps(data, indent=2)}")

            # Send ping
            print("📤 Sending ping...")
            await websocket.send("ping")

            # Receive pong
            response = await websocket.recv()
            print(f"📥 Received: {response}")

            # Keep connection open for a bit
            print("⏳ Keeping connection open for 3 seconds...")
            await asyncio.sleep(3)

            print("✅ Test completed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(test_trace_websocket())
