"""Export a saved trip as Markdown or iCalendar (.ics)."""
from datetime import datetime, timedelta, timezone


def _money(v: float, cur: str) -> str:
    return f"{cur} {v:,.0f}"


def to_markdown(trip: dict) -> str:
    it = trip.get("itinerary") or {}
    cur = trip.get("currency", "")
    L = [f"# {trip['title']}", "",
         f"**{trip['destination']}** · {trip['start_date']} → {trip['end_date']} · "
         f"{trip['travelers']} traveller(s)", "",
         f"Budget: {_money(float(trip['budget']), cur)} · Estimated cost: {_money(float(trip['estimated_cost']), cur)}", ""]
    if it.get("summary"):
        L += [it["summary"], ""]
    if it.get("stays"):
        L += ["## Where to stay", ""]
        L += [f"- **{s['name']}** ({s.get('type', '')}) - {_money(s.get('price_per_night', 0), cur)}/night. {s.get('why', '')}"
              for s in it["stays"]]
        L.append("")
    for d in it.get("days", []):
        L += [f"## Day {d['day']} · {d['date']} - {d.get('theme', '')}", ""]
        for i in d["items"]:
            cost = f" · {_money(i['cost'], cur)} pp" if i.get("cost") else ""
            L.append(f"- **{i['time']}** {i['title']} _({i['type']})_{cost}")
            if i.get("description"):
                L.append(f"  - {i['description']}")
            if i.get("location"):
                L.append(f"  - 📍 {i['location']}")
        L.append("")
    for title, key in (("Getting around", "transport_tips"), ("Tips", "tips")):
        if it.get(key):
            L += [f"## {title}", ""] + [f"- {t}" for t in it[key]] + [""]
    return "\n".join(L)


def _esc(s: str) -> str:
    return str(s).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def to_ics(trip: dict) -> str:
    it = trip.get("itinerary") or {}
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Travel Itinerary Planner//EN", "CALSCALE:GREGORIAN"]
    for d in it.get("days", []):
        for i in d["items"]:
            try:
                start = datetime.fromisoformat(f"{d['date']}T{i['time']}:00")
            except ValueError:
                continue
            end = start + timedelta(minutes=int(i.get("duration_min") or 60))
            out += ["BEGIN:VEVENT", f"UID:{trip['id']}-{i.get('id', '')}@itinerary-planner", f"DTSTAMP:{stamp}",
                    f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}", f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
                    f"SUMMARY:{_esc(i['title'])}", f"DESCRIPTION:{_esc(i.get('description', ''))}",
                    f"LOCATION:{_esc(i.get('location', ''))}", "END:VEVENT"]
    out.append("END:VCALENDAR")
    return "\r\n".join(out) + "\r\n"
