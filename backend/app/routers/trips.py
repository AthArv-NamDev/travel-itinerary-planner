import re
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..auth import current_user
from ..db import Database, get_db
from ..schemas import Itinerary, RegenerateDayRequest, ShareRequest, TripRequest, TripUpdate
from ..services import ai, export
from ..services.optimizer import finalize

router = APIRouter(prefix="/api", tags=["trips"])

LIST_COLS = ("id,title,destination,start_date,end_date,travelers,budget,currency,vibe,pace,"
             "estimated_cost,favorite,share_token,summary,created_at")


async def _own_trip(db: Database, trip_id: uuid.UUID, uid: str) -> dict:
    rows = await db.select("trips", {"id": trip_id, "user_id": uid})
    if not rows:
        raise HTTPException(404, "Trip not found")
    return rows[0]


def _req_from_row(row: dict) -> TripRequest:
    return TripRequest(
        destination=row["destination"], start_date=row["start_date"], end_date=row["end_date"],
        travelers=row["travelers"], budget=float(row["budget"]) or 1, currency=row["currency"],
        budget_level=row["budget_level"], pace=row["pace"], vibe=row["vibe"],
        interests=row["interests"] or [], notes=row.get("notes", ""),
    )


@router.post("/trips/generate", status_code=201)
async def generate_trip(req: TripRequest, uid: str = Depends(current_user), db: Database = Depends(get_db)):
    it = await ai.generate_itinerary(req)
    cost = finalize(it, req.start_date, req.travelers, req.num_days)
    row = await db.insert("trips", {
        "user_id": uid, "title": f"{req.destination} · {req.num_days} day{'s' if req.num_days > 1 else ''}",
        "destination": req.destination, "start_date": req.start_date.isoformat(), "end_date": req.end_date.isoformat(),
        "travelers": req.travelers, "budget": req.budget, "currency": req.currency, "budget_level": req.budget_level,
        "pace": req.pace, "vibe": req.vibe, "interests": req.interests, "notes": req.notes,
        "summary": it.summary, "itinerary": it.model_dump(), "estimated_cost": cost,
    })
    return row


@router.get("/trips")
async def list_trips(uid: str = Depends(current_user), db: Database = Depends(get_db)):
    return await db.select("trips", {"user_id": uid}, columns=LIST_COLS, order="created_at.desc", limit=200)


@router.get("/trips/{trip_id}")
async def get_trip(trip_id: uuid.UUID, uid: str = Depends(current_user), db: Database = Depends(get_db)):
    return await _own_trip(db, trip_id, uid)


@router.patch("/trips/{trip_id}")
async def update_trip(trip_id: uuid.UUID, body: TripUpdate, uid: str = Depends(current_user),
                      db: Database = Depends(get_db)):
    row = await _own_trip(db, trip_id, uid)
    values: dict = {}
    if body.title is not None:
        t = body.title.strip()
        if not t:
            raise HTTPException(422, "Title cannot be empty")
        values["title"] = t
    if body.favorite is not None:
        values["favorite"] = body.favorite
    if body.notes is not None:
        values["notes"] = body.notes
    if body.itinerary is not None:
        try:
            it = Itinerary.model_validate(body.itinerary)
        except ValueError as e:
            raise HTTPException(422, f"Invalid itinerary: {e}")
        from datetime import date as _d
        cost = finalize(it, _d.fromisoformat(row["start_date"]), row["travelers"], reorder=False)
        values.update(itinerary=it.model_dump(), estimated_cost=cost, summary=it.summary)
    if not values:
        return row
    return (await db.update("trips", {"id": trip_id, "user_id": uid}, values))[0]


@router.delete("/trips/{trip_id}", status_code=204)
async def delete_trip(trip_id: uuid.UUID, uid: str = Depends(current_user), db: Database = Depends(get_db)):
    await _own_trip(db, trip_id, uid)
    await db.delete("trips", {"id": trip_id, "user_id": uid})
    return Response(status_code=204)


@router.post("/trips/{trip_id}/regenerate")
async def regenerate_trip(trip_id: uuid.UUID, uid: str = Depends(current_user), db: Database = Depends(get_db)):
    row = await _own_trip(db, trip_id, uid)
    req = _req_from_row(row)
    it = await ai.generate_itinerary(req)
    cost = finalize(it, req.start_date, req.travelers, req.num_days)
    return (await db.update("trips", {"id": trip_id, "user_id": uid},
                            {"itinerary": it.model_dump(), "estimated_cost": cost, "summary": it.summary}))[0]


@router.post("/trips/{trip_id}/days/{day}/regenerate")
async def regenerate_day(trip_id: uuid.UUID, day: int, body: RegenerateDayRequest,
                         uid: str = Depends(current_user), db: Database = Depends(get_db)):
    row = await _own_trip(db, trip_id, uid)
    it = Itinerary.model_validate(row["itinerary"])
    if not 1 <= day <= len(it.days):
        raise HTTPException(404, "Day not found")
    req = _req_from_row(row)
    new_day = await ai.regenerate_day(req, it.days[day - 1], body.instruction)
    it.days[day - 1] = new_day
    cost = finalize(it, req.start_date, req.travelers)
    return (await db.update("trips", {"id": trip_id, "user_id": uid},
                            {"itinerary": it.model_dump(), "estimated_cost": cost}))[0]


@router.post("/trips/{trip_id}/share")
async def share_trip(trip_id: uuid.UUID, body: ShareRequest, uid: str = Depends(current_user),
                     db: Database = Depends(get_db)):
    row = await _own_trip(db, trip_id, uid)
    token: Optional[str] = (row.get("share_token") or secrets.token_urlsafe(16)) if body.enabled else None
    await db.update("trips", {"id": trip_id, "user_id": uid}, {"share_token": token})
    return {"share_token": token}


def _safe_name(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "-", s).strip("-") or "trip"


@router.get("/trips/{trip_id}/export")
async def export_trip(trip_id: uuid.UUID, format: str = Query("md", pattern="^(md|ics|json)$"),
                      uid: str = Depends(current_user), db: Database = Depends(get_db)):
    import json as _json
    row = await _own_trip(db, trip_id, uid)
    name = _safe_name(row["title"])
    if format == "md":
        body, mime = export.to_markdown(row), "text/markdown"
    elif format == "ics":
        body, mime = export.to_ics(row), "text/calendar"
    else:
        body, mime = _json.dumps(row, indent=2, default=str), "application/json"
    return Response(body, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{name}.{format}"'})


@router.get("/shared/{token}")
async def shared_trip(token: str, db: Database = Depends(get_db)):
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,64}", token):
        raise HTTPException(404, "Shared trip not found")
    rows = await db.select("trips", {"share_token": token})
    if not rows:
        raise HTTPException(404, "Shared trip not found")
    row = rows[0]
    row.pop("user_id", None)
    row.pop("share_token", None)
    return row
