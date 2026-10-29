"""Offline provider so the whole app works without any AI key (demo / tests)."""
from ..schemas import Day, TripRequest

_SLOTS = [
    ("08:30", "Breakfast at a local café", "food", 60, 0.04),
    ("10:00", "Landmark walk in {d}", "attraction", 120, 0.05),
    ("13:00", "Lunch at a popular local restaurant", "food", 75, 0.06),
    ("15:00", "Museum or cultural site in {d}", "attraction", 120, 0.06),
    ("17:30", "Sunset viewpoint / evening stroll", "activity", 90, 0.02),
    ("20:00", "Dinner trying signature dishes", "food", 90, 0.08),
]


def _items(req: TripRequest, n: int) -> list[dict]:
    per_person_day = req.budget / req.travelers / req.num_days
    n_items = {"relaxed": 4, "balanced": 6, "packed": 6}[req.pace]
    out = []
    for time, title, typ, dur, share in _SLOTS[:n_items]:
        out.append({
            "time": time, "title": title.format(d=req.destination) + (f" (day {n})" if typ == "attraction" else ""),
            "type": typ, "description": f"A {req.vibe}-flavoured stop picked for your {req.budget_level} budget.",
            "location": req.destination, "duration_min": dur, "cost": round(per_person_day * share * 3),
        })
    return out


def mock_itinerary(req: TripRequest) -> dict:
    per_night = round(req.budget / req.num_days * {"budget": 0.18, "mid": 0.28, "premium": 0.4}[req.budget_level])
    return {
        "summary": f"A {req.pace} {req.vibe} trip to {req.destination} for {req.travelers} traveller(s). "
                   "(Demo content: set AI_PROVIDER and an API key for real, personalised plans.)",
        "stays": [{"name": f"Central {req.budget_level} stay in {req.destination}", "type": "hotel",
                   "price_per_night": per_night, "why": "Close to main sights and transport."}],
        "transport_tips": ["Use local transit or ride-hailing between areas.", "Walk within neighbourhoods."],
        "tips": ["Book popular attractions in advance.", "Carry a power bank and some cash."],
        "days": [{"day": n, "theme": f"Day {n} highlights", "items": _items(req, n)} for n in range(1, req.num_days + 1)],
    }


def mock_day(req: TripRequest, day: Day) -> dict:
    return {"day": day.day, "theme": "Fresh alternative day", "items": _items(req, day.day)}


def mock_recommendations(vibe: str) -> dict:
    base = {
        "adventure": [("Manali", "India", "Treks, rafting and snow", 4500), ("Queenstown", "New Zealand", "Bungee and alpine adventure", 14000),
                      ("Interlaken", "Switzerland", "Paragliding and canyons", 20000), ("Rishikesh", "India", "Rafting and camping", 3000),
                      ("Banff", "Canada", "Mountain hikes and lakes", 16000)],
        "culture": [("Kyoto", "Japan", "Temples and traditions", 9000), ("Jaipur", "India", "Forts and palaces", 3500),
                    ("Rome", "Italy", "Ancient history", 12000), ("Istanbul", "Turkey", "East meets West", 6000),
                    ("Hanoi", "Vietnam", "Old quarter and street life", 3500)],
        "romantic": [("Udaipur", "India", "Lakeside palaces", 5000), ("Santorini", "Greece", "Sunsets and cliffs", 15000),
                     ("Paris", "France", "Classic romance", 16000), ("Bali", "Indonesia", "Villas and beaches", 6000),
                     ("Venice", "Italy", "Canals and candle-lit dinners", 14000)],
        "foodie": [("Bangkok", "Thailand", "Street food capital", 4000), ("Lucknow", "India", "Awadhi cuisine", 2500),
                   ("Osaka", "Japan", "Takoyaki to kaiseki", 9000), ("Mexico City", "Mexico", "Tacos and markets", 6500),
                   ("Penang", "Malaysia", "Hawker food heaven", 3500)],
    }
    rows = base.get(vibe) or [("Goa", "India", "Beaches and relaxed vibes", 4000), ("Lisbon", "Portugal", "Hills, trams and seafood", 9000),
                              ("Bali", "Indonesia", "Nature and wellness", 6000), ("Cape Town", "South Africa", "Mountains and coast", 8000),
                              ("Chiang Mai", "Thailand", "Temples and nature", 3500)]
    return {"destinations": [
        {"destination": d, "country": c, "why": f"{w}. (Demo suggestion.)", "best_for": vibe,
         "est_daily_cost_per_person": p, "currency": "INR", "highlights": [w]} for d, c, w, p in rows]}
