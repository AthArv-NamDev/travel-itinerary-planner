import re
from datetime import date
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Vibe = Literal["adventure", "culture", "romantic", "foodie", "nature", "nightlife", "family", "wellness"]
Pace = Literal["relaxed", "balanced", "packed"]
BudgetLevel = Literal["budget", "mid", "premium"]
ITEM_TYPES = ("attraction", "food", "transport", "activity", "stay")
MAX_TRIP_DAYS = 14


# ---------------------------------------------------------------- helpers
def _num(v: Any, default: Any = 0.0) -> Any:
    """Forgiving number parser: LLMs sometimes return '₹1,200' or null."""
    try:
        if v is None or isinstance(v, bool):
            return default
        if isinstance(v, str):
            v = re.sub(r"[^\d.\-]", "", v)
        return float(v)
    except (TypeError, ValueError):
        return default


_TIME_RE = re.compile(r"(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?")


def norm_time(v: Any) -> str:
    """Normalise '9:30 AM', '09:30', 930 ... to 'HH:MM' (defaults to 09:00)."""
    if v is None:
        return "09:00"
    m = _TIME_RE.search(str(v))
    if not m:
        return "09:00"
    h, mi, ap = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or "").lower()
    if ap == "pm" and h < 12:
        h += 12
    if ap == "am" and h == 12:
        h = 0
    if h > 23 or mi > 59:
        return "09:00"
    return f"{h:02d}:{mi:02d}"


def _str(v: Any) -> str:
    return "" if v is None else str(v)


# ---------------------------------------------------------------- requests
class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    travelers: int = Field(default=1, ge=1, le=20)
    budget: float = Field(gt=0, le=1_000_000_000)  # total for the whole group
    currency: str = Field(default="INR", min_length=3, max_length=3)
    budget_level: BudgetLevel = "mid"
    pace: Pace = "balanced"
    vibe: Vibe = "culture"
    interests: list[str] = Field(default_factory=list, max_length=12)
    notes: str = Field(default="", max_length=1000)

    @field_validator("destination", "notes")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("currency")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()

    @model_validator(mode="after")
    def _check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.num_days > MAX_TRIP_DAYS:
            raise ValueError(f"Trips are limited to {MAX_TRIP_DAYS} days")
        return self

    @property
    def num_days(self) -> int:
        return (self.end_date - self.start_date).days + 1


class TripUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    favorite: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=1000)
    itinerary: Optional[dict] = None


class RegenerateDayRequest(BaseModel):
    instruction: str = Field(default="", max_length=300)


class ShareRequest(BaseModel):
    enabled: bool = True


class PreferencesIn(BaseModel):
    interests: list[str] = Field(default_factory=list, max_length=12)
    pace: Pace = "balanced"
    vibe: Vibe = "culture"
    budget_level: BudgetLevel = "mid"
    currency: str = Field(default="INR", min_length=3, max_length=3)


class RecommendRequest(BaseModel):
    vibe: Vibe = "culture"
    interests: list[str] = Field(default_factory=list, max_length=12)
    budget_level: BudgetLevel = "mid"
    month: str = Field(default="", max_length=30)
    origin: str = Field(default="", max_length=80)
    days: int = Field(default=5, ge=1, le=MAX_TRIP_DAYS)


# ---------------------------------------------------------------- itinerary
class Item(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = ""
    time: str = "09:00"
    title: str = Field(min_length=1, max_length=200)
    type: str = "activity"
    description: str = ""
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    duration_min: int = 60
    cost: float = 0  # per person, in the trip currency
    travel_km: float = 0
    travel_min: int = 0
    done: bool = False

    @field_validator("time", mode="before")
    @classmethod
    def _time(cls, v):
        return norm_time(v)

    @field_validator("type", mode="before")
    @classmethod
    def _type(cls, v):
        v = _str(v).strip().lower()
        return v if v in ITEM_TYPES else "activity"

    @field_validator("description", "location", "id", mode="before")
    @classmethod
    def _text(cls, v):
        return _str(v)

    @field_validator("cost", "travel_km", mode="before")
    @classmethod
    def _positive(cls, v):
        return max(0.0, _num(v, 0.0))

    @field_validator("duration_min", "travel_min", mode="before")
    @classmethod
    def _minutes(cls, v):
        return int(min(max(_num(v, 60), 0), 720))

    @field_validator("lat", mode="before")
    @classmethod
    def _lat(cls, v):
        n = _num(v, None)
        return n if n is not None and -90 <= n <= 90 else None

    @field_validator("lng", mode="before")
    @classmethod
    def _lng(cls, v):
        n = _num(v, None)
        return n if n is not None and -180 <= n <= 180 else None

    @model_validator(mode="after")
    def _no_zero_island(self):
        # Models often emit 0,0 when they don't know a coordinate
        if self.lat == 0 and self.lng == 0:
            self.lat = self.lng = None
        return self


class Day(BaseModel):
    model_config = ConfigDict(extra="ignore")

    day: int = 0
    date: str = ""
    theme: str = ""
    items: list[Item] = Field(default_factory=list)
    distance_km: float = 0

    @field_validator("theme", "date", mode="before")
    @classmethod
    def _text(cls, v):
        return _str(v)

    @field_validator("day", mode="before")
    @classmethod
    def _day(cls, v):
        return int(_num(v, 0))

    @field_validator("distance_km", mode="before")
    @classmethod
    def _dist(cls, v):
        return max(0.0, _num(v, 0.0))


class Stay(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1)
    type: str = "hotel"
    price_per_night: float = 0
    why: str = ""

    @field_validator("price_per_night", mode="before")
    @classmethod
    def _price(cls, v):
        return max(0.0, _num(v, 0.0))

    @field_validator("type", "why", mode="before")
    @classmethod
    def _text(cls, v):
        return _str(v)


class Itinerary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    stays: list[Stay] = Field(default_factory=list)
    transport_tips: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    days: list[Day] = Field(min_length=1)
    cost_breakdown: dict[str, float] = Field(default_factory=dict)
    generated_by: str = ""

    @field_validator("summary", "generated_by", mode="before")
    @classmethod
    def _text(cls, v):
        return _str(v)

    @field_validator("transport_tips", "tips", mode="before")
    @classmethod
    def _str_list(cls, v):
        if not isinstance(v, list):
            return []
        return [_str(x) for x in v if x]

    @field_validator("stays", mode="before")
    @classmethod
    def _stays(cls, v):
        return v if isinstance(v, list) else []
