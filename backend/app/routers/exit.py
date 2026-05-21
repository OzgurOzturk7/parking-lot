from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import ParkingSession, Spot, FlaggedPlate
from ..schemas import ExitIn, ExitOut, RatePlanOut
from ..billing import calculate_fee
from ..redis_client import decr_zone

router = APIRouter(tags=["exit"])


@router.post("/exit", response_model=ExitOut)
def vehicle_exit(payload: ExitIn, db: Session = Depends(get_db)):
    flag = db.get(FlaggedPlate, payload.license_plate)
    if flag:
        raise HTTPException(403, detail={
            "error": "PAYMENT_REQUIRED",
            "license_plate": flag.license_plate,
            "outstanding_balance": float(flag.outstanding_balance),
            "message": "This plate has unpaid sessions. Settle before exit.",
        })

    session = db.scalar(select(ParkingSession).where(
        ParkingSession.license_plate == payload.license_plate,
        ParkingSession.status == "active",
    ).with_for_update())
    if not session:
        raise HTTPException(404, detail={"error": "NO_ACTIVE_SESSION", "message": "no active session for this plate"})

    spot = db.get(Spot, session.spot_id)
    zone = spot.zone
    plan = zone.rate_plan
    now = datetime.now(timezone.utc)

    duration, units, fee = calculate_fee(
        session.entry_time, now, plan.billing_type, plan.amount, plan.grace_minutes
    )

    session.exit_time = now
    session.total_fee = fee
    session.billed_units = units
    session.status = "completed"
    spot.status = "available"
    db.commit()

    decr_zone(zone.id)
    return ExitOut(
        session_id=session.id,
        license_plate=session.license_plate,
        entry_time=session.entry_time,
        exit_time=session.exit_time,
        duration_minutes=duration,
        billed_units=units,
        rate_plan=RatePlanOut(
            type=plan.billing_type,
            amount=plan.amount,
            grace_minutes=plan.grace_minutes,
        ),
        total_fee=fee,
        spot_code=spot.code,
    )
