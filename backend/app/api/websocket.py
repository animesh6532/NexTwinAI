"""
NexTwin AI — websocket.py
=========================
FastAPI WebSocket handler for real-time telemetry, predictions, and events.
Allows the frontend to subscribe to live physical updates.

Author: Principal AI Architect & Edge AI Engineer
"""

import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from app.utils.logger import logger

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active sessions: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining active: {len(self.active_connections)}")

    async def broadcast(self, payload: dict):
        """Sends data payload to all active clients"""
        if not self.active_connections:
            return
        
        message = json.dumps(payload)
        logger.debug(f"Broadcasting telemetry over WS: {message[:120]}...")
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to transmit to connection, marking for clean-up: {str(e)}")
                disconnected.append(connection)
                
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """Telemetry stream connection endpoint"""
    await manager.connect(websocket)
    try:
        # Keep connection open, handle client heartbeats
        while True:
            data = await websocket.receive_text()
            # Respond to ping to maintain socket
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket execution error: {str(e)}")
        manager.disconnect(websocket)

def broadcast_live_update(event_type: str, data: dict):
    """Helper to dispatch updates from synchronous backend routes to WebSockets"""
    payload = {
        "event": event_type,
        "data": data
    }
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.broadcast(payload))
        else:
            loop.run_until_complete(manager.broadcast(payload))
    except RuntimeError:
        # No running loop, run in new loop
        asyncio.run(manager.broadcast(payload))
    except Exception as e:
        logger.error(f"Failed to dispatch broadcast update: {str(e)}")
