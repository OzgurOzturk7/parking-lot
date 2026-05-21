from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class RatePlanOut(BaseModel):
    type: str
    amount: Decimal
    grace_minutes: int


class EntryIn(BaseModel):
    license_plate: str = Field(min_length=2, max_length=20)
    zone_id: int


class EntrySpot(BaseModel):
    id: int
    code: str
    zone_name: str


class EntryOut(BaseModel):
    session_id: int
    license_plate: str
    spot: EntrySpot
    entry_time: datetime
    rate_plan: RatePlanOut


class ExitIn(BaseModel):
    license_plate: str = Field(min_length=2, max_length=20)


class ExitOut(BaseModel):
    session_id: int
    license_plate: str
    entry_time: datetime
    exit_time: datetime
    duration_minutes: int
    billed_units: int
    rate_plan: RatePlanOut
    total_fee: Decimal
    spot_code: str


class LotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str


class ZoneOut(BaseModel):
    id: int
    name: str
    floor: int
    capacity: int
    occupied: int
    rate_plan: RatePlanOut


class LotZonesOut(BaseModel):
    lot_id: int
    lot_name: str
    zones: list[ZoneOut]


class OccupancyOut(BaseModel):
    zone_id: int
    capacity: int
    occupied: int
    available: int
    as_of: datetime


class SessionOut(BaseModel):
    session_id: int
    license_plate: str
    entry_time: datetime
    exit_time: datetime | None
    duration_minutes: int | None
    billed_units: int | None
    rate_plan: RatePlanOut
    total_fee: Decimal | None
    spot_code: str


class FlaggedIn(BaseModel):
    license_plate: str = Field(min_length=2, max_length=20)
    outstanding_balance: Decimal
    reason: str


class FlaggedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    license_plate: str
    outstanding_balance: Decimal
    reason: str
    flagged_at: datetime
