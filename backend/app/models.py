from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class RatePlan(Base):
    __tablename__ = "rate_plan"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    billing_type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    grace_minutes: Mapped[int] = mapped_column(Integer, default=0)


class ParkingLot(Base):
    __tablename__ = "parking_lot"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    zones: Mapped[list["Zone"]] = relationship(back_populates="lot")


class Zone(Base):
    __tablename__ = "zone"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("parking_lot.id"))
    name: Mapped[str] = mapped_column(String(80))
    floor_number: Mapped[int]
    capacity: Mapped[int]
    rate_plan_id: Mapped[int] = mapped_column(ForeignKey("rate_plan.id"))
    lot: Mapped[ParkingLot] = relationship(back_populates="zones")
    rate_plan: Mapped[RatePlan] = relationship()


class Spot(Base):
    __tablename__ = "spot"
    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zone.id"))
    code: Mapped[str] = mapped_column(String(20))
    spot_type: Mapped[str] = mapped_column(String(20), default="standard")
    status: Mapped[str] = mapped_column(String(20), default="available")
    zone: Mapped[Zone] = relationship()


class ParkingSession(Base):
    __tablename__ = "parking_session"
    id: Mapped[int] = mapped_column(primary_key=True)
    license_plate: Mapped[str] = mapped_column(String(20))
    spot_id: Mapped[int] = mapped_column(ForeignKey("spot.id"))
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    exit_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    billed_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    spot: Mapped[Spot] = relationship()


class FlaggedPlate(Base):
    __tablename__ = "flagged_plate"
    license_plate: Mapped[str] = mapped_column(String(20), primary_key=True)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    reason: Mapped[str] = mapped_column(String(255))
    flagged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
