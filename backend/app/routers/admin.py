from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import FlaggedPlate
from ..schemas import FlaggedIn, FlaggedOut
from ..auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.post("/flagged-plates", response_model=FlaggedOut, status_code=201)
def add_flag(payload: FlaggedIn, db: Session = Depends(get_db)):
    existing = db.get(FlaggedPlate, payload.license_plate)
    if existing:
        existing.outstanding_balance = payload.outstanding_balance
        existing.reason = payload.reason
        db.commit()
        db.refresh(existing)
        return existing
    f = FlaggedPlate(
        license_plate=payload.license_plate,
        outstanding_balance=payload.outstanding_balance,
        reason=payload.reason,
        flagged_at=datetime.now(timezone.utc),
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@router.get("/flagged-plates", response_model=list[FlaggedOut])
def list_flagged(min_balance: float = Query(0), db: Session = Depends(get_db)):
    return db.scalars(
        select(FlaggedPlate)
        .where(FlaggedPlate.outstanding_balance >= Decimal(str(min_balance)))
        .order_by(FlaggedPlate.flagged_at.desc())
    ).all()


@router.delete("/flagged-plates/{plate}", status_code=204)
def delete_flag(plate: str, db: Session = Depends(get_db)):
    f = db.get(FlaggedPlate, plate)
    if not f:
        raise HTTPException(404, detail={"error": "NOT_FLAGGED", "message": "plate is not flagged"})
    db.delete(f)
    db.commit()
