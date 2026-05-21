from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import ParkingLot, Zone
from ..schemas import LotOut, LotZonesOut, ZoneOut, RatePlanOut
from ..redis_client import get_zone as redis_get_zone

router = APIRouter(tags=["lots"])


@router.get("/lots", response_model=list[LotOut])
def list_lots(db: Session = Depends(get_db)):
    return db.scalars(select(ParkingLot).order_by(ParkingLot.id)).all()


@router.get("/lots/{lot_id}/zones", response_model=LotZonesOut)
def lot_zones(lot_id: int, db: Session = Depends(get_db)):
    lot = db.get(ParkingLot, lot_id)
    if not lot:
        raise HTTPException(404, detail={"error": "LOT_NOT_FOUND", "message": "lot does not exist"})
    zones = db.scalars(select(Zone).where(Zone.lot_id == lot_id).order_by(Zone.id)).all()
    out = []
    for z in zones:
        out.append(ZoneOut(
            id=z.id,
            name=z.name,
            floor=z.floor_number,
            capacity=z.capacity,
            occupied=redis_get_zone(z.id),
            rate_plan=RatePlanOut(
                type=z.rate_plan.billing_type,
                amount=z.rate_plan.amount,
                grace_minutes=z.rate_plan.grace_minutes,
            ),
        ))
    return LotZonesOut(lot_id=lot.id, lot_name=lot.name, zones=out)
