"""
AISStream.io WebSocket Service
Connects to wss://stream.aisstream.io/v0/stream, collects a fixed snapshot of up to 20 real AIS vessels,
and streams live position/sog/cog updates to connected clients.
"""
import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone
import websockets
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ais_service")
logging.basicConfig(level=logging.INFO)

AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream"

# Broad high-density global shipping lanes
GLOBAL_BOUNDING_BOXES = [
    # English Channel & North Sea
    [[48.0, -5.0], [55.0, 10.0]],
    # Mediterranean & Gibraltar
    [[30.0, -6.0], [40.0, 36.0]],
    # Malacca Strait & SE Asia
    [[0.0, 95.0], [15.0, 110.0]],
    # Indian Ocean & Arabian Sea
    [[5.0, 60.0], [25.0, 85.0]],
    # US East Coast & Gulf of Mexico
    [[24.0, -95.0], [42.0, -70.0]],
    # East Asia / Tokyo Bay / Taiwan Strait
    [[20.0, 120.0], [38.0, 142.0]]
]

class AISStreamManager:
    _instance: Optional["AISStreamManager"] = None

    def __init__(self):
        self.api_key: str = os.getenv("AISSTREAM_API_KEY", "").strip()
        self.vessels: Dict[str, dict] = {}  # mmsi -> vessel dict
        self.selected_mmsis: List[str] = [] # Ordered list of up to 20 fixed MMSIs
        self.target_count: int = 20
        self.is_collecting: bool = True
        self.status: str = "DISCONNECTED"  # CONNECTING, LIVE, PARTIAL DATA, DISCONNECTED, NO_KEY, ERROR
        self.ws_subscribers: Set[websockets.WebSocketServerProtocol] = set()
        self.running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self.last_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> "AISStreamManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload_api_key(self):
        load_dotenv(override=True)
        self.api_key = os.getenv("AISSTREAM_API_KEY", "").strip()

    def get_status(self) -> str:
        if not self.api_key:
            return "NO_KEY"
        return self.status

    def get_vessels_snapshot(self) -> List[dict]:
        """Return the current list of up to 20 normalized vessels."""
        return [self.vessels[mmsi] for mmsi in self.selected_mmsis if mmsi in self.vessels]

    async def start(self):
        if self.running:
            return
        self.reload_api_key()
        if not self.api_key:
            self.status = "NO_KEY"
            logger.warning("AISSTREAM_API_KEY is not configured. Live AIS stream will remain inactive.")
            return

        self.running = True
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.status = "DISCONNECTED"

    async def refresh_snapshot(self) -> List[dict]:
        """Clear current 20-vessel snapshot and begin collecting a fresh set of up to 20 real vessels."""
        async with self._lock:
            self.vessels.clear()
            self.selected_mmsis.clear()
            self.is_collecting = True
            if self.status == "LIVE":
                self.status = "PARTIAL DATA"

        # Broadcast refresh event to subscribers
        await self._broadcast({
            "type": "SNAPSHOT_REFRESH",
            "vessels": [],
            "count": 0,
            "status": self.status
        })

        # Wait briefly (up to 3.5s) to allow new vessels to arrive if streaming
        for _ in range(35):
            if len(self.selected_mmsis) >= self.target_count:
                break
            await asyncio.sleep(0.1)

        return self.get_vessels_snapshot()

    async def _run_loop(self):
        """Continuous connection loop with exponential backoff."""
        backoff = 1
        while self.running:
            try:
                self.reload_api_key()
                if not self.api_key:
                    self.status = "NO_KEY"
                    await asyncio.sleep(5)
                    continue

                self.status = "CONNECTING"
                logger.info(f"Connecting to AISStream at {AIS_STREAM_URL}...")

                async with websockets.connect(
                    AIS_STREAM_URL,
                    ping_interval=20,
                    ping_timeout=20,
                    close_timeout=10
                ) as ws:
                    self.status = "LIVE" if len(self.selected_mmsis) >= self.target_count else "PARTIAL DATA"
                    backoff = 1  # Reset backoff upon successful connect
                    logger.info("Connected to AISStream. Sending subscription message...")

                    # Send subscription
                    sub_message = {
                        "APIKey": self.api_key,
                        "BoundingBoxes": GLOBAL_BOUNDING_BOXES,
                        "FilterMessageTypes": ["PositionReport"]
                    }
                    await ws.send(json.dumps(sub_message))

                    async for raw_msg in ws:
                        if not self.running:
                            break
                        try:
                            data = json.loads(raw_msg)
                            await self._handle_ais_message(data)
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            logger.error(f"Error handling AIS message: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.last_error = str(e)
                self.status = "RECONNECTING"
                logger.warning(f"AISStream connection dropped: {e}. Retrying in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

        self.status = "DISCONNECTED"

    async def _handle_ais_message(self, data: dict):
        msg_type = data.get("MessageType")
        if msg_type != "PositionReport":
            return

        meta = data.get("MetaData", {})
        pos_report = data.get("Message", {}).get("PositionReport", {})

        # Safe MMSI normalization
        raw_mmsi = meta.get("MMSI") or pos_report.get("UserID")
        if raw_mmsi is None:
            return
        mmsi = str(raw_mmsi).strip()
        if not mmsi or mmsi == "0":
            return

        # Safe coordinate extraction & bounds validation
        lat = pos_report.get("Latitude")
        if lat is None:
            lat = meta.get("latitude")
        lon = pos_report.get("Longitude")
        if lon is None:
            lon = meta.get("longitude")

        if lat is None or lon is None:
            return

        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            return

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return

        # Safe SOG (knots)
        raw_sog = pos_report.get("Sog")
        sog = None
        if raw_sog is not None:
            try:
                val = float(raw_sog)
                if val <= 102.2:  # 102.3 is AIS standard for not available
                    sog = round(val, 1)
            except (ValueError, TypeError):
                pass

        # Safe COG (degrees)
        raw_cog = pos_report.get("Cog")
        cog = None
        if raw_cog is not None:
            try:
                val = float(raw_cog)
                if val <= 360.0:
                    cog = round(val, 1)
            except (ValueError, TypeError):
                pass

        # Ship Name
        raw_name = meta.get("ShipName", "").strip()
        ship_name = raw_name if raw_name else f"VESSEL {mmsi}"

        # Timestamp
        timestamp = meta.get("time_utc")
        if not timestamp:
            timestamp = datetime.now(timezone.utc).isoformat()

        # Build normalized vessel schema
        vessel = {
            "mmsi": mmsi,
            "shipName": ship_name,
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "sog": sog,
            "cog": cog,
            "timestamp": timestamp,
            "source": "AISSTREAM_LIVE"
        }

        async with self._lock:
            # Phase 1: Fixed snapshot membership collection
            if mmsi not in self.selected_mmsis:
                if len(self.selected_mmsis) < self.target_count:
                    self.selected_mmsis.append(mmsi)
                    self.vessels[mmsi] = vessel
                    if len(self.selected_mmsis) >= self.target_count:
                        self.is_collecting = False
                        self.status = "LIVE"
                    else:
                        self.status = "PARTIAL DATA"

                    # Broadcast new addition
                    await self._broadcast({
                        "type": "VESSEL_ADDED",
                        "vessel": vessel,
                        "count": len(self.selected_mmsis),
                        "status": self.status
                    })
                else:
                    # Target 20 reached. Reject new vessel IDs to maintain stable 20-vessel membership!
                    return
            else:
                # Phase 2: Update existing vessel in the 20-vessel snapshot
                # Keep ship name if already known, or update with richer name
                if ship_name.startswith("VESSEL ") and not self.vessels[mmsi]["shipName"].startswith("VESSEL "):
                    vessel["shipName"] = self.vessels[mmsi]["shipName"]

                self.vessels[mmsi] = vessel

                # Broadcast live position update for this vessel
                await self._broadcast({
                    "type": "VESSEL_UPDATE",
                    "vessel": vessel,
                    "count": len(self.selected_mmsis),
                    "status": self.status
                })

    async def register_subscriber(self, ws):
        self.ws_subscribers.add(ws)
        # Immediately push current snapshot
        snapshot = self.get_vessels_snapshot()
        status = self.get_status()
        await ws.send_text(json.dumps({
            "type": "SNAPSHOT_INIT",
            "vessels": snapshot,
            "count": len(snapshot),
            "status": status
        }))

    def unregister_subscriber(self, ws):
        self.ws_subscribers.discard(ws)

    async def _broadcast(self, message: dict):
        if not self.ws_subscribers:
            return
        payload = json.dumps(message)
        dead = set()
        for ws in self.ws_subscribers:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.ws_subscribers.discard(ws)
