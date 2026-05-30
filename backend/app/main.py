from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from .database import engine
from .redis_client import set_zone
from .limiter import limiter
from .routers import entry, exit, lots, occupancy, sessions, admin, auth


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


app = FastAPI(title="Parking Lot Management API", version="0.2.0", lifespan=lifespan)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"error": "RATE_LIMITED", "message": f"too many requests, slow down ({exc.detail})"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/api/v1"
app.include_router(auth.router, prefix=prefix)
app.include_router(entry.router, prefix=prefix)
app.include_router(exit.router, prefix=prefix)
app.include_router(lots.router, prefix=prefix)
app.include_router(occupancy.router, prefix=prefix)
app.include_router(sessions.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)


@app.get("/")
def root():
    return {"name": "parking-lot-api", "docs": "/docs"}
