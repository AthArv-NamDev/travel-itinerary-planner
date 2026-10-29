"""Prompt structuring: turns user preferences into precise, JSON-only instructions."""
import json

from ..schemas import Day, TripRequest

SYSTEM = (
    "You are an expert travel planner. You reply with ONE valid JSON object only: no markdown, "
    "no code fences, no commentary. Use real, well-known places that exist in the destination, "
    "with accurate latitude/longitude. All money values are per person in the requested currency "
    "unless stated otherwise."
)

PACE_RULES = {
    "relaxed": "3-4 items per day, long meals, free time, start after 09:30",
    "balanced": "5-6 items per day, a mix of sightseeing and downtime",
    "packed": "7-8 items per day, start early, maximise sights",
}
VIBE_RULES = {
    "adventure": "outdoor activities, treks, water sports, offbeat spots",
    "culture": "museums, heritage sites, local traditions, markets, architecture",
    "romantic": "scenic viewpoints, sunset spots, candle-lit dinners, intimate stays",
    "foodie": "signature local dishes, street food, markets, cooking classes, famous eateries",
    "nature": "parks, lakes, wildlife, viewpoints, gardens, quiet places",
    "nightlife": "evening/late-night venues, live music, rooftop bars, night markets",
    "family": "kid-friendly attractions, short transfers, parks, interactive experiences",
    "wellness": "spas, yoga, slow mornings, healthy food, calm nature",
}
BUDGET_RULES = {
    "budget": "hostels/budget stays, street food, public transport, free attractions",
    "mid": "comfortable 3-star stays, good local restaurants, mix of paid and free sights",
    "premium": "boutique/luxury stays, fine dining, private transfers, signature experiences",
}

ITEM_SHAPE = (
    '{"time":"HH:MM 24h","title":"...","type":"attraction|food|transport|activity|stay",'
    '"description":"1-2 sentences","location":"area or address","lat":0.0,"lng":0.0,'
    '"duration_min":60,"cost":0}'
)


def _context(req: TripRequest) -> str:
    return (
        f"Destination: {req.destination}\n"
        f"Dates: {req.start_date} to {req.end_date} ({req.num_days} days)\n"
        f"Travellers: {req.travelers}\n"
        f"Total group budget: {req.budget:.0f} {req.currency} "
        f"(~{req.budget / req.travelers / req.num_days:.0f} {req.currency} per person per day)\n"
        f"Budget style: {req.budget_level} - {BUDGET_RULES[req.budget_level]}\n"
        f"Pace: {req.pace} - {PACE_RULES[req.pace]}\n"
        f"Vibe: {req.vibe} - {VIBE_RULES[req.vibe]}\n"
        f"Interests: {', '.join(req.interests) or 'none specified'}\n"
        f"Extra notes: {req.notes or 'none'}\n"
    )


def itinerary_prompt(req: TripRequest) -> str:
    return (
        "Create a day-by-day itinerary.\n\n" + _context(req) + "\n"
        "Rules:\n"
        "- Group nearby places on the same day to minimise travel; order items chronologically.\n"
        "- Include breakfast/lunch/dinner as type \"food\" with a named real restaurant or dish area.\n"
        "- Include local transport hops as type \"transport\" where useful.\n"
        "- Keep the whole plan within the total budget.\n"
        f"- Return EXACTLY {req.num_days} days.\n\n"
        "JSON schema:\n"
        '{"summary":"2 sentence trip overview",'
        '"stays":[{"name":"...","type":"hotel|hostel|resort|homestay","price_per_night":0,"why":"..."}],'
        '"transport_tips":["..."],"tips":["..."],'
        f'"days":[{{"day":1,"theme":"short theme","items":[{ITEM_SHAPE}]}}]}}\n'
        "stays: 2-3 options, price_per_night is per room. Return only the JSON."
    )


def day_prompt(req: TripRequest, day: Day, instruction: str) -> str:
    current = json.dumps([{"time": i.time, "title": i.title, "type": i.type} for i in day.items])
    return (
        f"Re-plan ONLY day {day.day} ({day.date}) of a trip.\n\n" + _context(req) + "\n"
        f"Current plan for that day: {current}\n"
        f"User instruction: {instruction or 'Give me a fresh alternative day with different places.'}\n\n"
        'Return JSON: {"day":%d,"theme":"...","items":[%s]}. Only the JSON.' % (day.day, ITEM_SHAPE)
    )


def recommend_prompt(vibe: str, interests: list[str], budget_level: str, month: str, origin: str, days: int) -> str:
    return (
        "Recommend 5 travel destinations.\n"
        f"Vibe: {vibe} - {VIBE_RULES.get(vibe, '')}\n"
        f"Interests: {', '.join(interests) or 'any'}\n"
        f"Budget style: {budget_level}\n"
        f"Travel month: {month or 'flexible'}\n"
        f"Travelling from: {origin or 'unspecified'}\n"
        f"Trip length: {days} days\n\n"
        'Return JSON: {"destinations":[{"destination":"City","country":"Country","why":"1-2 sentences",'
        '"best_for":"short phrase","est_daily_cost_per_person":0,"currency":"INR","highlights":["a","b","c"]}]}'
    )
