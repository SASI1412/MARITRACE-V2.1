"""
FastAPI Backend for MariTrace Live Ship Tracking
Provides REST endpoints and WebSocket stream for real AISStream vessels.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .ais_service import AISStreamManager

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

ais_manager = AISStreamManager.get_instance()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up MariTrace Live AIS Backend...")
    await ais_manager.start()
    yield
    logger.info("Shutting down MariTrace Live AIS Backend...")
    await ais_manager.stop()

app = FastAPI(
    title="MariTrace AIS Live Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "MariTrace Live AIS",
        "ais_status": ais_manager.get_status(),
        "vessel_count": len(ais_manager.selected_mmsis)
    }

@app.get("/api/live-ais")
async def get_live_ais():
    """
    Retrieve current snapshot of up to 20 real transmitting AISStream vessels.
    """
    status = ais_manager.get_status()
    if status == "NO_KEY":
        return {
            "success": False,
            "error": "AISSTREAM_API_KEY is not configured in backend/.env",
            "vessels": [],
            "count": 0,
            "status": "NO_KEY"
        }

    vessels = ais_manager.get_vessels_snapshot()
    return {
        "success": True,
        "vessels": vessels,
        "count": len(vessels),
        "status": status
    }

@app.post("/api/live-ais/refresh")
async def refresh_live_ais():
    """
    Explicitly reset current 20-vessel snapshot and collect a fresh 20-vessel set.
    """
    status = ais_manager.get_status()
    if status == "NO_KEY":
        return {
            "success": False,
            "error": "AISSTREAM_API_KEY is not configured in backend/.env",
            "vessels": [],
            "count": 0,
            "status": "NO_KEY"
        }

    vessels = await ais_manager.refresh_snapshot()
    return {
        "success": True,
        "vessels": vessels,
        "count": len(vessels),
        "status": ais_manager.get_status()
    }

@app.websocket("/ws/ais")
async def websocket_ais(websocket: WebSocket):
    """
    WebSocket endpoint for frontend clients to receive real-time updates for the active 20 vessels.
    """
    await websocket.accept()
    await ais_manager.register_subscriber(websocket)
    try:
        while True:
            # Keep socket alive and handle client pings / messages
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
            elif msg == "refresh":
                await ais_manager.refresh_snapshot()
    except WebSocketDisconnect:
        ais_manager.unregister_subscriber(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ais_manager.unregister_subscriber(websocket)
