import asyncio
from backend.ais_service import AISStreamManager

def test_singleton():
    mgr1 = AISStreamManager.get_instance()
    mgr2 = AISStreamManager.get_instance()
    assert mgr1 is mgr2

async def test_normalization_and_20_limit():
    mgr = AISStreamManager()
    mgr.running = True

    # 1. Feed 25 unique PositionReport messages
    for i in range(1, 26):
        sample_msg = {
            "MessageType": "PositionReport",
            "MetaData": {
                "MMSI": 200000000 + i,
                "ShipName": f"VESSEL {i}",
                "latitude": 10.0 + (i * 0.1),
                "longitude": 70.0 + (i * 0.1),
                "time_utc": "2026-09-11T12:00:00Z"
            },
            "Message": {
                "PositionReport": {
                    "UserID": 200000000 + i,
                    "Latitude": 10.0 + (i * 0.1),
                    "Longitude": 70.0 + (i * 0.1),
                    "Sog": 12.5,
                    "Cog": 180.0
                }
            }
        }
        await mgr._handle_ais_message(sample_msg)

    # 2. Check that count is strictly capped at 20
    snapshot = mgr.get_vessels_snapshot()
    assert len(snapshot) == 20, f"Expected 20 vessels, got {len(snapshot)}"
    assert snapshot[0]["mmsi"] == "200000001"
    assert snapshot[19]["mmsi"] == "200000020"

    # 3. Check vessel #21 was NOT added (stable membership)
    mmsis = [v["mmsi"] for v in snapshot]
    assert "200000021" not in mmsis

    # 4. Check that an update to an existing vessel DOES update its position
    update_msg = {
        "MessageType": "PositionReport",
        "MetaData": {
            "MMSI": 200000001,
            "ShipName": "VESSEL 1 UPDATED",
            "latitude": 10.9999,
            "longitude": 70.9999,
            "time_utc": "2026-09-11T12:05:00Z"
        },
        "Message": {
            "PositionReport": {
                "UserID": 200000001,
                "Latitude": 10.9999,
                "Longitude": 70.9999,
                "Sog": 15.0,
                "Cog": 195.0
            }
        }
    }
    await mgr._handle_ais_message(update_msg)
    updated_v1 = mgr.vessels["200000001"]
    assert updated_v1["lat"] == 10.9999
    assert updated_v1["sog"] == 15.0
    assert updated_v1["cog"] == 195.0
    # Total count must remain 20
    assert len(mgr.get_vessels_snapshot()) == 20

    # 5. Invalid records must be safely rejected
    invalid_coords_msg = {
        "MessageType": "PositionReport",
        "MetaData": { "MMSI": 999999999 },
        "Message": { "PositionReport": { "Latitude": 195.0, "Longitude": 25.0 } }
    }
    await mgr._handle_ais_message(invalid_coords_msg)
    assert "999999999" not in mgr.vessels

    missing_mmsi_msg = {
        "MessageType": "PositionReport",
        "MetaData": {},
        "Message": { "PositionReport": { "Latitude": 15.0, "Longitude": 25.0 } }
    }
    await mgr._handle_ais_message(missing_mmsi_msg)

    print("All backend AIS service tests passed!")

if __name__ == "__main__":
    asyncio.run(test_normalization_and_20_limit())
