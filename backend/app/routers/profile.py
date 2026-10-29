from fastapi import APIRouter, Depends

from ..auth import current_user
from ..db import Database, get_db
from ..schemas import PreferencesIn, RecommendRequest
from ..services import ai

router = APIRouter(prefix="/api", tags=["profile"])

DEFAULT_PREFS = {"interests": [], "pace": "balanced", "vibe": "culture", "budget_level": "mid", "currency": "INR"}


@router.get("/preferences")
async def get_preferences(uid: str = Depends(current_user), db: Database = Depends(get_db)):
    rows = await db.select("user_preferences", {"user_id": uid})
    return rows[0] if rows else {"user_id": uid, **DEFAULT_PREFS}


@router.put("/preferences")
async def save_preferences(body: PreferencesIn, uid: str = Depends(current_user), db: Database = Depends(get_db)):
    return await db.upsert("user_preferences", {"user_id": uid, **body.model_dump()}, on_conflict="user_id")


@router.post("/recommendations")
async def recommendations(body: RecommendRequest, uid: str = Depends(current_user)):
    rows = await ai.recommend(body.vibe, body.interests, body.budget_level, body.month, body.origin, body.days)
    return {"destinations": rows}
