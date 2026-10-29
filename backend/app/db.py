"""Tiny async client for Supabase's PostgREST API (no heavy SDK needed)."""
import logging
from typing import Any, Optional

import httpx
from fastapi import HTTPException

from .config import get_settings

log = logging.getLogger("db")


class Database:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _http(self) -> httpx.AsyncClient:
        s = get_settings()
        if not s.supabase_configured:
            raise HTTPException(503, "Supabase is not configured on the server (check backend/.env)")
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=f"{s.supabase_url.rstrip('/')}/rest/v1",
                headers={
                    "apikey": s.supabase_service_role_key,
                    "Authorization": f"Bearer {s.supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                timeout=20,
            )
        return self._client

    async def _req(self, method: str, table: str, *, params=None, json=None, prefer="return=representation") -> list[dict]:
        try:
            r = await self._http().request(method, f"/{table}", params=params, json=json, headers={"Prefer": prefer})
        except httpx.HTTPError as e:
            log.error("Supabase network error: %s", e)
            raise HTTPException(502, "Could not reach the database")
        if r.status_code >= 400:
            log.error("Supabase %s %s -> %s %s", method, table, r.status_code, r.text[:300])
            raise HTTPException(502, "Database request failed")
        return r.json() if r.content else []

    @staticmethod
    def _eq(match: dict[str, Any]) -> dict[str, str]:
        return {k: f"eq.{v}" for k, v in match.items()}

    async def select(self, table: str, match: Optional[dict] = None, columns: str = "*",
                     order: Optional[str] = None, limit: Optional[int] = None) -> list[dict]:
        params: dict[str, Any] = {"select": columns, **self._eq(match or {})}
        if order:
            params["order"] = order
        if limit:
            params["limit"] = limit
        return await self._req("GET", table, params=params)

    async def insert(self, table: str, row: dict) -> dict:
        rows = await self._req("POST", table, json=row)
        return rows[0]

    async def upsert(self, table: str, row: dict, on_conflict: str) -> dict:
        rows = await self._req("POST", table, params={"on_conflict": on_conflict}, json=row,
                               prefer="resolution=merge-duplicates,return=representation")
        return rows[0]

    async def update(self, table: str, match: dict, values: dict) -> list[dict]:
        return await self._req("PATCH", table, params=self._eq(match), json=values)

    async def delete(self, table: str, match: dict) -> list[dict]:
        return await self._req("DELETE", table, params=self._eq(match))


_db = Database()


def get_db() -> Database:
    return _db
