# API Contract - Phase 1

9 endpoints, all return JSON. Base URL is `/api/v1`.
I tried to keep the surface small.

Auth is not added in Phase 1. The `/admin/*` group will get JWT in
Phase 3, for now it stays open so I can test it from Postman.

## Endpoint list

| # | Method | Path | What it does |
|---|--------|------|--------------|
| 1 | POST | `/entry` | Park a car, open a session |
| 2 | POST | `/exit` | Leave the lot using only the plate |
| 3 | GET | `/lots` | List all parking lots |
| 4 | GET | `/lots/{lot_id}/zones` | Zones in a lot with live occupancy |
| 5 | GET | `/occupancy/{zone_id}` | Live counter for one zone |
| 6 | GET | `/sessions/{session_id}` | Get a receipt by session id |
| 7 | POST | `/admin/flagged-plates` | Add a plate to the unpaid list |
| 8 | GET | `/admin/flagged-plates` | List flagged plates |
| 9 | DELETE | `/admin/flagged-plates/{plate}` | Remove a flag once the driver pays |

---

## 1. POST /entry

Picks the first free spot in the zone and opens a session.
If the plate already has an active session, I return that one instead
of creating a new row. This is on purpose, so a double click on the
kiosk does not create two sessions.

**Request**
```json
{
  "license_plate": "34ABC123",
  "zone_id": 2
}
```

**Response 201**
```json
{
  "session_id": 187,
  "license_plate": "34ABC123",
  "spot": {
    "id": 45,
    "code": "A-12",
    "zone_name": "Zone A"
  },
  "entry_time": "2026-05-12T14:02:11Z",
  "rate_plan": {
    "type": "per_hour",
    "amount": 5.00,
    "grace_minutes": 5
  }
}
```

**Spot picking rule** (Phase 2)
- Pick the first available spot in the zone (lowest `code`)
- If no free spot -> `409`

**Errors**
- `404 ZONE_NOT_FOUND`
- `409 ZONE_FULL`
- `409 PLATE_ALREADY_INSIDE` - plate has an active session somewhere else

---

## 2. POST /exit

The main feature. Only the plate is sent. The backend finds the active
session, calculates the fee, frees the spot, drops the Redis counter
by 1, and returns the receipt.

**Request**
```json
{
  "license_plate": "34ABC123"
}
```

**Response 200**
```json
{
  "session_id": 187,
  "license_plate": "34ABC123",
  "entry_time": "2026-05-12T14:02:11Z",
  "exit_time": "2026-05-12T15:47:55Z",
  "duration_minutes": 106,
  "billed_units": 2,
  "rate_plan": {
    "type": "per_hour",
    "amount": 5.00,
    "grace_minutes": 5
  },
  "total_fee": 10.00,
  "spot_code": "A-12"
}
```

`billed_units` is what got charged. Here it is 2 hours, because the
plan is per_hour and 106 minutes rounds up to 2.

**Errors**
- `403 PAYMENT_REQUIRED` - plate is on the unpaid list
  ```json
  {
    "error": "PAYMENT_REQUIRED",
    "license_plate": "34ABC123",
    "outstanding_balance": 47.50,
    "message": "This plate has unpaid sessions. Settle before exit."
  }
  ```
- `404 NO_ACTIVE_SESSION` - plate is not currently parked

---

## 3. GET /lots

Just a list. The frontend uses this for a dropdown.

**Response 200**
```json
[
  { "id": 1, "name": "Downtown Lot", "address": "Main St 10" },
  { "id": 2, "name": "Airport Lot B", "address": "Terminal 2" }
]
```

---

## 4. GET /lots/{lot_id}/zones

Zones inside a lot. Each zone shows live occupancy so the frontend can
render "FULL" or "HAS SPACE" without a second call.

**Response 200**
```json
{
  "lot_id": 1,
  "lot_name": "Downtown Lot",
  "zones": [
    {
      "id": 2,
      "name": "Zone A",
      "floor": -1,
      "capacity": 50,
      "occupied": 47,
      "rate_plan": { "type": "per_hour", "amount": 5.00 }
    },
    {
      "id": 3,
      "name": "EV Zone",
      "floor": 0,
      "capacity": 10,
      "occupied": 4,
      "rate_plan": { "type": "per_minute", "amount": 0.20 }
    }
  ]
}
```

---

## 5. GET /occupancy/{zone_id}

For dashboards that refresh often. Reads from Redis directly, no
Postgres call. Fast on purpose.

**Response 200**
```json
{
  "zone_id": 2,
  "capacity": 50,
  "occupied": 47,
  "available": 3,
  "as_of": "2026-05-12T15:50:02Z"
}
```

---

## 6. GET /sessions/{session_id}

Same body as the `/exit` response. Useful if the driver wants the
receipt again.

If the session is still active, `exit_time`, `total_fee`, and
`billed_units` come back as `null`.

---

## 7. POST /admin/flagged-plates

Staff adds a plate here when a driver leaves without paying.

**Request**
```json
{
  "license_plate": "34ABC123",
  "outstanding_balance": 47.50,
  "reason": "card declined on session 142"
}
```

**Response 201**
```json
{
  "license_plate": "34ABC123",
  "outstanding_balance": 47.50,
  "reason": "card declined on session 142",
  "flagged_at": "2026-05-12T16:00:00Z"
}
```

If the plate is already flagged, the balance is updated instead of
creating a duplicate.

---

## 8. GET /admin/flagged-plates

Lists all flagged plates. Supports `?min_balance=` for filtering.

**Response 200**
```json
[
  {
    "license_plate": "34ABC123",
    "outstanding_balance": 47.50,
    "reason": "card declined on session 142",
    "flagged_at": "2026-05-12T16:00:00Z"
  }
]
```

---

## 9. DELETE /admin/flagged-plates/{plate}

Removes the flag after the driver pays the old debt. After this the
plate can exit normally again.

**Response 204** (empty body)

**Errors**
- `404 NOT_FLAGGED`

---

## Error response shape

All 4xx and 5xx errors look like this:

```json
{
  "error": "ERROR_CODE",
  "message": "human readable message",
  "details": {}
}
```

`details` is optional. I use it for cases like `PAYMENT_REQUIRED`
where I want to include extra fields.