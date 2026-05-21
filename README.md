# Parking Lot Management API

Backend for a smart parking lot. FastAPI + PostgreSQL + Redis.

## Stack

- FastAPI
- PostgreSQL 16
- Redis 7
- SQLAlchemy
- Pydantic v2

## Run

```bash
docker compose up -d postgres redis
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API is at http://localhost:8000, docs at http://localhost:8000/docs.

## Project structure

```
backend/
  app/
    main.py
    database.py
    redis_client.py
    models.py
    schemas.py
    billing.py
    routers/
  init.sql
  requirements.txt
docs/
  phase1/   ERD, API contract, design decisions
frontend/   Next.js dashboard (Phase 2)
docker-compose.yml
```

## Phases

- [x] Phase 1 - Design (ERD, API, decisions)
- [ ] Phase 2 - Build backend + frontend
- [ ] Phase 3 - JWT auth, validation, rate limiting
- [ ] Phase 4 - Docker, CI, deploy
