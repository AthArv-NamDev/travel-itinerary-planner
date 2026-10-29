"""AI orchestration: call the configured LLM, parse JSON defensively, validate, retry once."""
import json
import logging
import re
from typing import Any

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ..config import get_settings
from ..schemas import Day, Itinerary, TripRequest
from . import mock, prompts

log = logging.getLogger("ai")


class AIError(Exception):
    pass


# ------------------------------------------------------------ providers
async def _gemini(system: str, prompt: str) -> str:
    s = get_settings()
    if not s.gemini_api_key:
        raise AIError("GEMINI_API_KEY is not set")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{s.gemini_model}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "responseMimeType": "application/json"},
    }
    async with httpx.AsyncClient(timeout=s.ai_timeout_seconds) as c:
        r = await c.post(url, json=body, headers={"x-goog-api-key": s.gemini_api_key})
    if r.status_code != 200:
        raise AIError(f"Gemini error {r.status_code}: {r.text[:200]}")
    try:
        return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError, TypeError):
        raise AIError("Gemini returned an empty response")


async def _anthropic(system: str, prompt: str) -> str:
    s = get_settings()
    if not s.anthropic_api_key:
        raise AIError("ANTHROPIC_API_KEY is not set")
    body = {"model": s.anthropic_model, "max_tokens": 12000, "system": system,
            "messages": [{"role": "user", "content": prompt}]}
    async with httpx.AsyncClient(timeout=s.ai_timeout_seconds) as c:
        r = await c.post("https://api.anthropic.com/v1/messages", json=body,
                         headers={"x-api-key": s.anthropic_api_key, "anthropic-version": "2023-06-01"})
    if r.status_code != 200:
        raise AIError(f"Anthropic error {r.status_code}: {r.text[:200]}")
    try:
        return "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text")
    except (KeyError, TypeError):
        raise AIError("Anthropic returned an empty response")


async def _complete(prompt: str) -> str:
    provider = get_settings().effective_provider
    try:
        if provider == "gemini":
            return await _gemini(prompts.SYSTEM, prompt)
        if provider == "anthropic":
            return await _anthropic(prompts.SYSTEM, prompt)
    except httpx.TimeoutException:
        raise AIError("The AI provider timed out")
    except httpx.HTTPError as e:
        raise AIError(f"Could not reach the AI provider: {e}")
    raise AIError("No AI provider configured")


# ------------------------------------------------------------ parsing
def extract_json(text: str) -> dict:
    """Tolerates code fences and stray prose around the JSON object."""
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.I)
    try:
        v = json.loads(t)
    except json.JSONDecodeError:
        a, b = t.find("{"), t.rfind("}")
        if a == -1 or b <= a:
            raise AIError("The AI did not return JSON")
        try:
            v = json.loads(t[a:b + 1])
        except json.JSONDecodeError:
            raise AIError("The AI returned malformed JSON")
    if not isinstance(v, dict):
        raise AIError("The AI returned an unexpected shape")
    return v


async def _ask(prompt: str, validate) -> Any:
    """LLM call + parse + validate, with ONE retry on bad output."""
    last: Exception = AIError("unknown")
    for attempt in range(2):
        try:
            return validate(extract_json(await _complete(prompt)))
        except (AIError, ValidationError, ValueError) as e:
            last = e
            log.warning("AI attempt %d failed: %s", attempt + 1, e)
    raise AIError(str(last) if isinstance(last, AIError) else "The AI returned an invalid itinerary")


def _is_mock() -> bool:
    return get_settings().effective_provider == "mock"


# ------------------------------------------------------------ public API
async def generate_itinerary(req: TripRequest) -> Itinerary:
    def validate(d: dict) -> Itinerary:
        it = Itinerary.model_validate(d)
        if len(it.days) < req.num_days:
            raise AIError(f"The AI returned {len(it.days)} of {req.num_days} days")
        return it

    try:
        if _is_mock():
            it = validate(mock.mock_itinerary(req))
        else:
            it = await _ask(prompts.itinerary_prompt(req), validate)
    except AIError as e:
        raise HTTPException(502, f"Itinerary generation failed: {e}")
    it.generated_by = get_settings().effective_provider
    return it


async def regenerate_day(req: TripRequest, day: Day, instruction: str) -> Day:
    try:
        if _is_mock():
            return Day.model_validate(mock.mock_day(req, day))
        return await _ask(prompts.day_prompt(req, day, instruction), lambda d: Day.model_validate(d))
    except AIError as e:
        raise HTTPException(502, f"Day regeneration failed: {e}")


async def recommend(vibe: str, interests: list[str], budget_level: str, month: str, origin: str, days: int) -> list[dict]:
    def validate(d: dict) -> list[dict]:
        rows = d.get("destinations")
        if not isinstance(rows, list) or not rows:
            raise AIError("No destinations returned")
        return [r for r in rows if isinstance(r, dict) and r.get("destination")][:6]

    try:
        if _is_mock():
            return validate(mock.mock_recommendations(vibe))
        return await _ask(prompts.recommend_prompt(vibe, interests, budget_level, month, origin, days), validate)
    except AIError as e:
        raise HTTPException(502, f"Recommendations failed: {e}")
