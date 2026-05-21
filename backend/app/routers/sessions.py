from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ParkingSession
from ..schemas import SessionOut, RatePlanOut

router = APIRouter(tags=["sessions"])


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = db.get(ParkingSession, session_id)
    if not s:
        raise HTTPException(404, detail={"error": "SESSION_NOT_FOUND", "message": "session does not exist"})
    spot = s.spot
    plan = spot.zone.rate_plan
    duration = None
    if s.exit_time:
        duration = int((s.exit_time - s.entry_time).total_seconds() // 60)
    return SessionOut(
        session_id=s.id,
        license_plate=s.license_plate,
        entry_time=s.entry_time,
        exit_time=s.exit_time,
        duration_minutes=duration,
        billed_units=s.billed_units,
        rate_plan=RatePlanOut(
            type=plan.billing_type,
            amount=plan.amount,
            grace_minutes=plan.grace_minutes,
        ),
        total_fee=s.total_fee,
        spot_code=spot.code,
    )
