# Parking Lot Management API

Backend for a smart parking lot. License-plate based entry and exit,
real-time occupancy per zone, per-minute or per-hour billing, and a
flagged-plate registry that blocks drivers with unpaid sessions.

Built for the SFWE477 backend course as a 4-phase project.

## Stack

- FastAPI 0.115 (Python 3.11+)
- PostgreSQL 16
- Redis 7
- SQLAlchemy 2.0, Pydantic v2
- PyJWT + bcrypt for admin auth
- slowapi for rate limiting
- Next.js 16, Tailwind, shadcn/ui for the frontend

## Project structure

```
backend/
  app/
    main.py            FastAPI app, CORS, rate limit handler
    config.py          env-driven settings
    database.py        SQLAlchemy engine and session
    redis_client.py    zone counter helpers
    auth.py            JWT and bcrypt utilities
    limiter.py         slowapi limiter instance
    models.py          6 SQLAlchemy models
    schemas.py         Pydantic request and response schemas
    billing.py         fee calculation (grace + ceil)
    routers/
      entry.py         POST /entry, rate limited
      exit.py          POST /exit, rate limited, blocks flagged plates
      lots.py          GET /lots, GET /lots/{id}/zones
      occupancy.py     GET /occupancy/{zone_id}
      sessions.py      GET /sessions/{id}
      admin.py         flagged-plate CRUD, protected
      auth.py          POST /admin/login
  init.sql             schema + seed data (2 lots, 5 zones, 150 spots)
  requirements.txt
  .env.example

frontend/
  app/                 Next.js routes (dashboard, entry, exit, admin, login)
  components/          UI primitives, nav, theme toggle
  lib/                 api client, utils

docs/phase1/           ERD, API contract, design decisions
docker-compose.yml     Postgres + Redis
```

## Running locally

You need Docker, Python 3.11+, and Node 20+.

### 1. Start the databases

```bash
docker compose up -d
```

Postgres lands on port 5433 and Redis on 6380 to avoid clashing
with locally installed services.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate           # Windows
# source .venv/bin/activate      # macOS / Linux
pip install -r requirements.txt
cp .env.example .env             # then edit JWT_SECRET to anything long
uvicorn app.main:app --reload
```

API at http://localhost:8000, Swagger at http://localhost:8000/docs.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:3000.

## Admin login

The init.sql seeds one admin account:

```
username: admin
password: admin123
```

The password is stored as a bcrypt hash. The plain value is only for
local demo. Change `JWT_SECRET` and rotate the admin password before
deploying anywhere real.

In the Swagger UI click the lock icon and paste the JWT from
`POST /admin/login`. In the web UI, just visit `/admin` and you will
be redirected to the login page.

## Endpoints

```
POST   /api/v1/entry                       open a session
POST   /api/v1/exit                        close a session by plate
GET    /api/v1/lots                        list parking lots
GET    /api/v1/lots/{lot_id}/zones         zones with live occupancy
GET    /api/v1/occupancy/{zone_id}         single zone counter
GET    /api/v1/sessions/{session_id}       receipt by id
POST   /api/v1/admin/login                 returns a JWT
GET    /api/v1/admin/flagged-plates        list flagged plates
POST   /api/v1/admin/flagged-plates        add or update a flag
DELETE /api/v1/admin/flagged-plates/{plate} clear a flag
```

`/entry` and `/exit` are rate limited to 20 requests per minute per
client IP.

## Try the flagged-plate flow

After the seed runs you can demo the blocking behavior straight away.

```bash
# active session, returns the receipt
curl -X POST http://localhost:8000/api/v1/exit \
  -H "Content-Type: application/json" \
  -d '{"license_plate":"34LIVE01"}'

# flagged plate, returns 403 with the outstanding balance
curl -X POST http://localhost:8000/api/v1/exit \
  -H "Content-Type: application/json" \
  -d '{"license_plate":"34DBT999"}'
```

## Phases

- [x] Phase 1 design (ERD, API contract, decisions in `docs/phase1/`)
- [x] Phase 2 backend implementation + frontend
- [x] Phase 3 JWT auth, input validation, rate limiting
- [ ] Phase 4 Docker compose for the full stack, GitHub Actions CI, deploy
