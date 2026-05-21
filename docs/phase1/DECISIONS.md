# Design Decisions - Phase 1

Three things the brief asked me to explain: Redis, billing, and race
conditions on the same spot.

---

## 1. Why Redis for live occupancy

I do not need Redis for correctness. I need it for speed.

The dashboard shows "Zone A: 47/50" and refreshes often. If I answer
that with a Postgres `COUNT(*)` every time, multiply by 20 zones and
many open dashboards, the DB gets hammered for a number that barely
changes.

So I keep one counter per zone in Redis:

```
zone:2:occupied = 47
```

- Entry -> `INCR zone:2:occupied`
- Exit  -> `DECR zone:2:occupied`
- Read  -> `GET  zone:2:occupied`

All sub-millisecond and atomic.

**Postgres is still the truth.** Redis is a cache. If Redis crashes I
rebuild the counters on startup with one query:

```sql
SELECT zone_id, COUNT(*) FROM spot
WHERE status = 'occupied' GROUP BY zone_id;
```

---

## 2. Billing model

Each zone has a `rate_plan` with three fields:

- `billing_type` -> `per_minute` or `per_hour`
- `amount` -> price per unit
- `grace_minutes` -> free time at the start

### Formula

```
duration   = (exit_time - entry_time) in minutes
billable   = max(0, duration - grace_minutes)
unit_size  = 1 if per_minute else 60
billed     = ceil(billable / unit_size)
fee        = billed * amount
```

I use `ceil` (round up), not nearest. Real lots do this. 61 minutes
on a per-hour plan is 2 hours.

Grace minutes is a small touch so a 3 minute drop-off does not get
charged. Same math, one extra subtraction.

### Example

Entry 14:00, exit 15:47, plan per_hour @ 5.00, grace 5.
- duration = 107
- billable = 102
- billed   = ceil(102 / 60) = 2
- fee      = 10.00

I did not build dynamic pricing (time of day, demand). The brief did
not ask for it.

---

## 3. Race conditions

### Two cars, same last spot

Without protection both reads see A-12 free, both write A-12, and now
one spot has two cars. To prevent this I let Postgres do the locking:

```sql
SELECT id FROM spot
WHERE zone_id = :zone_id AND status = 'available'
ORDER BY code
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

- `FOR UPDATE` locks the row I picked.
- `SKIP LOCKED` makes the second request skip A-12 and grab the next
  free spot, or get nothing.

Result: no double assignment, no app-side retry loop.
