"""Route & time optimisation: geographic ordering, travel times, no overlaps, cost totals."""
import math
import uuid
from datetime import date, timedelta
from typing import Optional

from ..schemas import Day, Itinerary, Item

ROAD_FACTOR = 1.3        # straight-line -> approximate road distance
CITY_SPEED_KMH = 25.0    # average urban speed incl. waiting
MOVABLE = ("attraction", "activity")


def haversine_km(a: Item, b: Item) -> float:
    r = 6371.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dphi = p2 - p1
    dl = math.radians(b.lng - a.lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _has(i: Item) -> bool:
    return i.lat is not None and i.lng is not None


def _to_min(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _fmt(mins: int) -> str:
    mins = max(0, min(mins, 23 * 60 + 30))
    return f"{mins // 60:02d}:{mins % 60:02d}"


def reorder_day(day: Day) -> None:
    """Nearest-neighbour ordering of sightseeing stops; meals/transport keep their slots."""
    movable = [i for i, it in enumerate(day.items) if it.type in MOVABLE and _has(it)]
    if len(movable) < 3:
        return
    slot_times = [day.items[i].time for i in movable]
    pool = [day.items[i] for i in movable]

    anchor: Optional[Item] = None
    for j in range(movable[0] - 1, -1, -1):
        if _has(day.items[j]):
            anchor = day.items[j]
            break

    ordered: list[Item] = []
    cur = anchor
    if cur is None:
        cur = pool.pop(0)
        ordered.append(cur)
    while pool:
        nxt = min(pool, key=lambda x: haversine_km(cur, x))
        pool.remove(nxt)
        ordered.append(nxt)
        cur = nxt

    for idx, it, t in zip(movable, ordered, slot_times):
        it.time = t
        day.items[idx] = it


def schedule_day(day: Day) -> None:
    """Computes travel legs and pushes start times forward so nothing overlaps."""
    prev: Optional[Item] = None
    prev_end: Optional[int] = None
    for it in day.items:
        if prev is not None and _has(prev) and _has(it):
            km = haversine_km(prev, it) * ROAD_FACTOR
            it.travel_km = round(km, 1)
            it.travel_min = int(km / CITY_SPEED_KMH * 60) + (5 if km > 0.2 else 0)
        start = _to_min(it.time)
        if prev_end is not None and start < prev_end + it.travel_min:
            start = prev_end + it.travel_min
            it.time = _fmt(start)
        prev_end = start + it.duration_min
        prev = it
    day.distance_km = round(sum(i.travel_km for i in day.items), 1)


def compute_costs(it: Itinerary, travelers: int) -> float:
    """Items are priced per person; the first suggested stay is priced per room-night."""
    b = {"stay": 0.0, "food": 0.0, "activities": 0.0, "transport": 0.0}
    for d in it.days:
        for i in d.items:
            if i.type == "food":
                b["food"] += i.cost * travelers
            elif i.type == "transport":
                b["transport"] += i.cost * travelers
            elif i.type == "stay":
                b["stay"] += i.cost * travelers
            else:
                b["activities"] += i.cost * travelers
    if it.stays:
        nights = max(len(it.days) - 1, 0)
        rooms = math.ceil(travelers / 2)
        b["stay"] += it.stays[0].price_per_night * nights * rooms
    it.cost_breakdown = {k: round(v, 2) for k, v in b.items()}
    return round(sum(b.values()), 2)


def finalize(it: Itinerary, start: date, travelers: int, num_days: Optional[int] = None,
             reorder: bool = True) -> float:
    """Normalises ids/day numbers/dates, optimises routes, returns the estimated total cost."""
    if num_days is not None:
        it.days = it.days[:num_days]
    for n, d in enumerate(it.days):
        d.day = n + 1
        d.date = (start + timedelta(days=n)).isoformat()
        for i in d.items:
            if not i.id:
                i.id = uuid.uuid4().hex[:8]
        if reorder:
            reorder_day(d)
        schedule_day(d)
    return compute_costs(it, travelers)
