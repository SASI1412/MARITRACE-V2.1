"""
Vercel Serverless Function entry point for MariTrace Live AIS
Provides /api/live-ais, /api/live-ais/refresh, and /api/health on Vercel.
"""
import os
import json
import asyncio
import time
from typing import List, Dict, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import websockets
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MariTrace Vercel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GLOBAL_BOUNDING_BOXES = [
    [[48.0, -5.0], [55.0, 10.0]],   # English Channel & North Sea
    [[30.0, -6.0], [40.0, 36.0]],   # Mediterranean
    [[0.0, 95.0], [15.0, 110.0]],   # Malacca Strait & SE Asia
    [[5.0, 60.0], [25.0, 85.0]],    # Indian Ocean / Arabian Sea
    [[24.0, -95.0], [42.0, -70.0]], # US East Coast & Gulf
    [[20.0, 120.0], [38.0, 142.0]]  # East Asia / Tokyo Bay
]

# In-memory cache for serverless container lifecycle
_cached_vessels: List[dict] = []
_last_fetch_time: float = 0
CACHE_TTL = 8  # seconds

async def fetch_real_ais_snapshot(api_key: str, max_vessels: int = 20, timeout_sec: float = 4.5) -> List[dict]:
    vessels = []
    seen = set()

    try:
        async with websockets.connect("wss://stream.aisstream.io/v0/stream", close_timeout=3) as ws:
            sub = {
                "APIKey": api_key,
                "BoundingBoxes": GLOBAL_BOUNDING_BOXES,
                "FilterMessageTypes": ["PositionReport"]
            }
            await ws.send(json.dumps(sub))

            start_t = time.time()
            while len(vessels) < max_vessels and (time.time() - start_t) < timeout_sec:
                try:
                    remaining = max(0.5, timeout_sec - (time.time() - start_t))
                    raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    data = json.loads(raw)
                    if data.get("MessageType") != "PositionReport":
                        continue

                    meta = data.get("MetaData", {})
                    pos = data.get("Message", {}).get("PositionReport", {})

                    raw_mmsi = meta.get("MMSI") or pos.get("UserID")
                    if raw_mmsi is None:
                        continue
                    mmsi = str(raw_mmsi).strip()
                    if not mmsi or mmsi in seen:
                        continue

                    lat = pos.get("Latitude") or meta.get("latitude")
                    lon = pos.get("Longitude") or meta.get("longitude")
                    if lat is None or lon is None:
                        continue

                    try:
                        lat_f = float(lat)
                        lon_f = float(lon)
                    except (ValueError, TypeError):
                        continue

                    if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0):
                        continue

                    # Safe speed
                    sog = None
                    if pos.get("Sog") is not None:
                        try:
                            v = float(pos.get("Sog"))
                            if v <= 102.2: sog = round(v, 1)
                        except (ValueError, TypeError): pass

                    # Safe course
                    cog = None
                    if pos.get("Cog") is not None:
                        try:
                            v = float(pos.get("Cog"))
                            if v <= 360.0: cog = round(v, 1)
                        except (ValueError, TypeError): pass

                    seen.add(mmsi)
                    ship_name = meta.get("ShipName", "").strip() or f"VESSEL {mmsi}"
                    timestamp = meta.get("time_utc") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                    vessels.append({
                        "mmsi": mmsi,
                        "shipName": ship_name,
                        "lat": round(lat_f, 4),
                        "lon": round(lon_f, 4),
                        "sog": sog,
                        "cog": cog,
                        "timestamp": timestamp,
                        "source": "AISSTREAM_LIVE"
                    })
                except (asyncio.TimeoutError, websockets.ConnectionClosed):
                    break
    except Exception as e:
        print(f"AISStream connection error: {e}")

    return vessels

@app.get("/api/health")
async def health():
    key = os.getenv("AISSTREAM_API_KEY", "").strip()
    return {
        "status": "healthy",
        "platform": "Vercel Serverless",
        "has_key": bool(key)
    }

@app.get("/api/live-ais")
async def get_live_ais(refresh: bool = False):
    global _cached_vessels, _last_fetch_time

    key = os.getenv("AISSTREAM_API_KEY", "").strip()
    if not key:
        return {
            "success": False,
            "error": "AISSTREAM_API_KEY is not configured in Vercel Environment Variables",
            "vessels": [],
            "count": 0,
            "status": "NO_KEY"
        }

    now = time.time()
    if refresh or not _cached_vessels or (now - _last_fetch_time > CACHE_TTL):
        fresh = await fetch_real_ais_snapshot(key)
        if fresh:
            _cached_vessels = fresh
            _last_fetch_time = now

    return {
        "success": True,
        "vessels": _cached_vessels,
        "count": len(_cached_vessels),
        "status": "LIVE" if len(_cached_vessels) >= 20 else ("PARTIAL" if _cached_vessels else "CONNECTING")
    }

@app.post("/api/live-ais/refresh")
async def refresh_live_ais():
    return await get_live_ais(refresh=True)
