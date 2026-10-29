import asyncio
import copy
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.auth import current_user
from app.config import get_settings
from app.db import get_db
from app.main import app
from app.schemas import Itinerary, TripRequest, norm_time
from app.services import ai, optimizer
from app.services.ai import AIError, extract_json

USER = str(uuid.uuid4())
OTHER = str(uuid.uuid4())


# ------------------------------------------------------------------ fakes
class FakeDB:
    def __init__(self):
        self.tables = {"trips": [], "user_preferences": []}

    @staticmethod
    def _m(r, match):
        return all(str(r.get(k)) == str(v) for k, v in (match or {}).items())

    async def select(self, table, match=None, columns="*", order=None, limit=None):
        return [copy.deepcopy(r) for r in self.tables[table] if self._m(r, match)]

    async def insert(self, table, row):
        row = {"id": str(uuid.uuid4()), "favorite": False, "share_token": None, "created_at": "now", **row}
        self.tables[table].append(row)
        return copy.deepcopy(row)

    async def upsert(self, table, row, on_conflict):
        self.tables[table] = [r for r in self.tables[table] if r.get(on_conflict) != row[on_conflict]] + [row]
        return row

    async def update(self, table, match, values):
        out = []
        for r in self.tables[table]:
            if self._m(r, match):
                r.update(values)
                out.append(copy.deepcopy(r))
        return out

    async def delete(self, table, match):
        self.tables[table] = [r for r in self.tables[table] if not self._m(r, match)]
        return []


@pytest.fixture(autouse=True)
def mock_provider(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    db = FakeDB()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[current_user] = lambda: USER
    yield TestClient(app)
    app.dependency_overrides.clear()


PAYLOAD = {"destination": "Jaipur", "start_date": "2026-12-01", "end_date": "2026-12-03", "travelers": 2,
           "budget": 30000, "currency": "inr", "vibe": "culture", "pace": "balanced", "budget_level": "mid",
           "interests": ["food"]}


# ------------------------------------------------------------------ unit tests
def test_norm_time():
    assert norm_time("9:30 AM") == "09:30"
    assert norm_time("1 PM") == "13:00"
    assert norm_time("12 AM") == "00:00"
    assert norm_time(None) == "09:00"
    assert norm_time("nonsense") == "09:00"
    assert norm_time("27:99") == "09:00"


def test_extract_json_variants():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('Sure! {"a": 1} hope that helps') == {"a": 1}
    with pytest.raises(AIError):
        extract_json("no json here")
    with pytest.raises(AIError):
        extract_json("[1,2]")


def test_itinerary_tolerates_messy_llm_output():
    it = Itinerary.model_validate({"days": [{"items": [
        {"title": "A", "time": "9am", "cost": "₹1,200", "lat": 0, "lng": 0, "type": "Weird"},
        {"title": "B", "duration_min": None, "cost": None}]}]})
    a, b = it.days[0].items
    assert a.time == "09:00" and a.cost == 1200 and a.lat is None and a.type == "activity"
    assert b.duration_min == 60 and b.cost == 0


def test_request_validation():
    with pytest.raises(ValueError):
        TripRequest(destination="X1", start_date="2026-12-05", end_date="2026-12-01", budget=100)
    with pytest.raises(ValueError):
        TripRequest(destination="Paris", start_date="2026-12-01", end_date="2027-02-01", budget=100)


def _item(title, lat, lng, t, typ="attraction", dur=60):
    return {"title": title, "lat": lat, "lng": lng, "time": t, "type": typ, "duration_min": dur}


def test_optimizer_orders_by_proximity_and_avoids_overlap():
    it = Itinerary.model_validate({"days": [{"items": [
        _item("Start", 28.60, 77.20, "09:00"),
        _item("Far", 28.90, 77.50, "10:00"),
        _item("Near", 28.61, 77.21, "11:00"),
        _item("Mid", 28.70, 77.30, "12:00"),
    ]}]})
    optimizer.finalize(it, date(2026, 12, 1), 2)
    titles = [i.title for i in it.days[0].items]
    assert titles == ["Start", "Near", "Mid", "Far"]
    items = it.days[0].items
    for prev, cur in zip(items, items[1:]):
        pe = optimizer._to_min(prev.time) + prev.duration_min
        assert optimizer._to_min(cur.time) >= pe  # no overlaps
    assert it.days[0].distance_km > 0
    assert it.days[0].date == "2026-12-01"


def test_cost_computation():
    it = Itinerary.model_validate({
        "stays": [{"name": "H", "price_per_night": 1000}],
        "days": [{"items": [{"title": "Lunch", "type": "food", "cost": 100},
                            {"title": "Fort", "type": "attraction", "cost": 50}]},
                 {"items": [{"title": "Cab", "type": "transport", "cost": 30}]}]})
    total = optimizer.finalize(it, date(2026, 12, 1), 3)
    # per-person: food 100*3, act 50*3, transport 30*3 ; stay 1 night * 2 rooms * 1000
    assert it.cost_breakdown == {"stay": 2000, "food": 300, "activities": 150, "transport": 90}
    assert total == 2540


def test_mock_provider_pipeline():
    req = TripRequest(**{**PAYLOAD, "start_date": date(2026, 12, 1), "end_date": date(2026, 12, 3)})
    it = asyncio.run(ai.generate_itinerary(req))
    assert len(it.days) == 3 and it.generated_by == "mock"


# ------------------------------------------------------------------ API tests
def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_requires_auth():
    app.dependency_overrides.clear()
    r = TestClient(app).get("/api/trips")
    assert r.status_code in (401, 503)


def test_trip_lifecycle(client):
    r = client.post("/api/trips/generate", json=PAYLOAD)
    assert r.status_code == 201, r.text
    trip = r.json()
    tid = trip["id"]
    assert trip["currency"] == "INR" and len(trip["itinerary"]["days"]) == 3
    assert trip["estimated_cost"] > 0

    assert len(client.get("/api/trips").json()) == 1
    assert client.get(f"/api/trips/{tid}").json()["id"] == tid

    r = client.patch(f"/api/trips/{tid}", json={"title": "My Jaipur", "favorite": True})
    assert r.json()["title"] == "My Jaipur" and r.json()["favorite"] is True
    assert client.patch(f"/api/trips/{tid}", json={"title": "  "}).status_code == 422

    # edit itinerary: drop an item, cost must be recomputed
    it = client.get(f"/api/trips/{tid}").json()["itinerary"]
    before = client.get(f"/api/trips/{tid}").json()["estimated_cost"]
    it["days"][0]["items"] = it["days"][0]["items"][:1]
    r = client.patch(f"/api/trips/{tid}", json={"itinerary": it})
    assert r.status_code == 200 and r.json()["estimated_cost"] < before

    r = client.post(f"/api/trips/{tid}/days/2/regenerate", json={"instruction": "more food"})
    assert r.status_code == 200
    assert client.post(f"/api/trips/{tid}/days/9/regenerate", json={}).status_code == 404
    assert client.post(f"/api/trips/{tid}/regenerate").status_code == 200

    for fmt, needle in (("md", "# My Jaipur"), ("ics", "BEGIN:VCALENDAR"), ("json", '"destination"')):
        r = client.get(f"/api/trips/{tid}/export?format={fmt}")
        assert r.status_code == 200 and needle in r.text
    assert client.get(f"/api/trips/{tid}/export?format=exe").status_code == 422

    token = client.post(f"/api/trips/{tid}/share", json={"enabled": True}).json()["share_token"]
    shared = client.get(f"/api/shared/{token}")
    assert shared.status_code == 200 and "user_id" not in shared.json()
    client.post(f"/api/trips/{tid}/share", json={"enabled": False})
    assert client.get(f"/api/shared/{token}").status_code == 404

    assert client.delete(f"/api/trips/{tid}").status_code == 204
    assert client.get(f"/api/trips/{tid}").status_code == 404


def test_users_cannot_see_each_others_trips(client):
    tid = client.post("/api/trips/generate", json=PAYLOAD).json()["id"]
    app.dependency_overrides[current_user] = lambda: OTHER
    assert client.get(f"/api/trips/{tid}").status_code == 404
    assert client.delete(f"/api/trips/{tid}").status_code == 404
    assert client.get("/api/trips").json() == []


def test_validation_errors_are_readable(client):
    bad = {**PAYLOAD, "end_date": "2026-11-01"}
    r = client.post("/api/trips/generate", json=bad)
    assert r.status_code == 422 and "end_date" in r.json()["detail"]
    assert client.post("/api/trips/generate", json={**PAYLOAD, "budget": -5}).status_code == 422
    assert client.get("/api/trips/not-a-uuid").status_code == 422


def test_preferences_and_recommendations(client):
    assert client.get("/api/preferences").json()["pace"] == "balanced"
    r = client.put("/api/preferences", json={"interests": ["food"], "pace": "packed", "vibe": "foodie",
                                             "budget_level": "budget", "currency": "INR"})
    assert r.status_code == 200
    assert client.get("/api/preferences").json()["pace"] == "packed"
    rec = client.post("/api/recommendations", json={"vibe": "foodie"}).json()["destinations"]
    assert len(rec) >= 3 and rec[0]["destination"]
