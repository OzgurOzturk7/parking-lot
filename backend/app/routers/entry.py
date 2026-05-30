from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import Zone, Spot, ParkingSession
from ..schemas import EntryIn, EntryOut, EntrySpot, RatePlanOut
from ..redis_client import incr_zone
from ..limiter import limiter

router = APIRouter(tags=["entry"])


@router.post("/entry", response_model=EntryOut, status_code=201)
@limiter.limit("20/minute")
def entry(request: Request, payload: EntryIn, db: Session = Depends(get_db)):
    zone = db.get(Zone, payload.zone_id)
    if not zone:
        raise HTTPException(404, detail={"error": "ZONE_NOT_FOUND", "message": "zone does not exist"})

    existing = db.scalar(select(ParkingSession).where(
        ParkingSession.license_plate == payload.license_plate,
        ParkingSession.status == "active",
    ))
    if existing:
        spot = db.get(Spot, existing.spot_id)
        return EntryOut(
            session_id=existing.id,
            license_plate=existing.license_plate,
            spot=EntrySpot(id=spot.id, code=spot.code, zone_name=spot.zone.name),
            entry_time=existing.entry_time,
            rate_plan=RatePlanOut(
                type=spot.zone.rate_plan.billing_type,
                amount=spot.zone.rate_plan.amount,
                grace_minutes=spot.zone.rate_plan.grace_minutes,
            ),
        )

    spot_id = db.execute(text("""
        SELECT id FROM spot
        WHERE zone_id = :zid AND status = 'available'
        ORDER BY code
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """), {"zid": payload.zone_id}).scalar()

    if not spot_id:
        raise HTTPException(409, detail={"error": "ZONE_FULL", "message": "no available spot in this zone"})

    spot = db.get(Spot, spot_id)
    spot.status = "occupied"
    session = ParkingSession(
        license_plate=payload.license_plate,
        spot_id=spot.id,
        entry_time=datetime.now(timezone.utc),
        status="active",
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, detail={"error": "PLATE_ALREADY_INSIDE", "message": "this plate has an active session elsewhere"})

    db.refresh(session)
    incr_zone(payload.zone_id)
    return EntryOut(
        session_id=session.id,
        license_plate=session.license_plate,
        spot=EntrySpot(id=spot.id, code=spot.code, zone_name=zone.name),
        entry_time=session.entry_time,
        rate_plan=RatePlanOut(
            type=zone.rate_plan.billing_type,
            amount=zone.rate_plan.amount,
            grace_minutes=zone.rate_plan.grace_minutes,
        ),
    )
