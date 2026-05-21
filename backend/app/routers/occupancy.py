from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Zone
from ..schemas import OccupancyOut
from ..redis_client import get_zone as redis_get_zone

router = APIRouter(tags=["occupancy"])


@router.get("/occupancy/{zone_id}", response_model=OccupancyOut)
def occupancy(zone_id: int, db: Session = Depends(get_db)):
    z = db.get(Zone, zone_id)
    if not z:
        raise HTTPException(404, detail={"error": "ZONE_NOT_FOUND", "message": "zone does not exist"})
    occ = redis_get_zone(zone_id)
    return OccupancyOut(
        zone_id=zone_id,
        capacity=z.capacity,
        occupied=occ,
        available=max(0, z.capacity - occ),
        as_of=datetime.now(timezone.utc),
    )
