"""Verifies the Supabase JWT sent by the frontend by asking Supabase Auth who it belongs to."""
import logging

import httpx
from fastapi import Header, HTTPException

from .config import get_settings

log = logging.getLogger("auth")


async def current_user(authorization: str = Header(default="")) -> str:
    """Returns the authenticated user's id (uuid string) or raises 401."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:].strip()
    s = get_settings()
    if not s.supabase_configured:
        raise HTTPException(503, "Supabase is not configured on the server")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{s.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"apikey": s.supabase_service_role_key, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as e:
        log.error("Auth service unreachable: %s", e)
        raise HTTPException(502, "Auth service unreachable")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")
    uid = r.json().get("id")
    if not uid:
        raise HTTPException(401, "Invalid session")
    return uid
