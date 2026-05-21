from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine
from .redis_client import set_zone
from .routers import entry, exit, lots, occupancy, sessions, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT z.id, COUNT(s.id)
            FROM zone z
            LEFT JOIN spot s ON s.zone_id = z.id AND s.status = 'occupied'
            GROUP BY z.id
        """)).all()
        for zone_id, count in rows:
            set_zone(zone_id, count)
    yield


app = FastAPI(title="Parking Lot Management API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/api/v1"
app.include_router(entry.router, prefix=prefix)
app.include_router(exit.router, prefix=prefix)
app.include_router(lots.router, prefix=prefix)
app.include_router(occupancy.router, prefix=prefix)
app.include_router(sessions.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)


@app.get("/")
def root():
    return {"name": "parking-lot-api", "docs": "/docs"}
