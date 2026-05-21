CREATE TABLE rate_plan (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL,
    billing_type  VARCHAR(20) NOT NULL CHECK (billing_type IN ('per_minute', 'per_hour')),
    amount        NUMERIC(10, 2) NOT NULL,
    grace_minutes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE parking_lot (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    address    VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE zone (
    id           SERIAL PRIMARY KEY,
    lot_id       INTEGER NOT NULL REFERENCES parking_lot(id) ON DELETE CASCADE,
    name         VARCHAR(80) NOT NULL,
    floor_number INTEGER NOT NULL DEFAULT 0,
    capacity     INTEGER NOT NULL,
    rate_plan_id INTEGER NOT NULL REFERENCES rate_plan(id)
);

CREATE TABLE spot (
    id        SERIAL PRIMARY KEY,
    zone_id   INTEGER NOT NULL REFERENCES zone(id) ON DELETE CASCADE,
    code      VARCHAR(20) NOT NULL,
    spot_type VARCHAR(20) NOT NULL DEFAULT 'standard'
              CHECK (spot_type IN ('standard', 'handicap', 'ev', 'compact')),
    status    VARCHAR(20) NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'occupied', 'out_of_service')),
    UNIQUE (zone_id, code)
);
CREATE INDEX idx_spot_zone_status ON spot (zone_id, status);

CREATE TABLE parking_session (
    id             SERIAL PRIMARY KEY,
    license_plate  VARCHAR(20) NOT NULL,
    spot_id        INTEGER NOT NULL REFERENCES spot(id),
    entry_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time      TIMESTAMPTZ,
    total_fee      NUMERIC(10, 2),
    billed_units   INTEGER,
    status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'completed'))
);
CREATE UNIQUE INDEX one_active_session_per_plate
    ON parking_session (license_plate) WHERE status = 'active';
CREATE INDEX idx_session_plate ON parking_session (license_plate);
CREATE INDEX idx_session_spot_active ON parking_session (spot_id) WHERE status = 'active';

CREATE TABLE flagged_plate (
    license_plate       VARCHAR(20) PRIMARY KEY,
    outstanding_balance NUMERIC(10, 2) NOT NULL,
    reason              VARCHAR(255) NOT NULL,
    flagged_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rate_plan (id, name, billing_type, amount, grace_minutes) VALUES
    (1, 'Standard Hourly',  'per_hour',   4.00, 5),
    (2, 'EV Charging',      'per_minute', 0.15, 0),
    (3, 'Airport Short',    'per_minute', 0.20, 5),
    (4, 'Airport Long',     'per_hour',   2.00, 10),
    (5, 'Premium Hourly',   'per_hour',   6.00, 0);
SELECT setval('rate_plan_id_seq', 5);

INSERT INTO parking_lot (id, name, address) VALUES
    (1, 'Downtown Lot',   'Main Street 10, Istanbul'),
    (2, 'Airport Lot B',  'Terminal 2 Parking, Istanbul Airport');
SELECT setval('parking_lot_id_seq', 2);

INSERT INTO zone (id, lot_id, name, floor_number, capacity, rate_plan_id) VALUES
    (1, 1, 'Zone A',     0, 40, 1),
    (2, 1, 'Zone B',     1, 40, 1),
    (3, 1, 'EV Zone',    0, 10, 2),
    (4, 2, 'Short Stay', 0, 30, 3),
    (5, 2, 'Long Stay', -1, 30, 4);
SELECT setval('zone_id_seq', 5);

INSERT INTO spot (zone_id, code, spot_type)
SELECT 1, 'A-' || LPAD(g::text, 2, '0'), 'standard' FROM generate_series(1, 40) g;
INSERT INTO spot (zone_id, code, spot_type)
SELECT 2, 'B-' || LPAD(g::text, 2, '0'),
       CASE WHEN g <= 3 THEN 'handicap' ELSE 'standard' END
FROM generate_series(1, 40) g;
INSERT INTO spot (zone_id, code, spot_type)
SELECT 3, 'EV-' || LPAD(g::text, 2, '0'), 'ev' FROM generate_series(1, 10) g;
INSERT INTO spot (zone_id, code, spot_type)
SELECT 4, 'S-' || LPAD(g::text, 2, '0'), 'standard' FROM generate_series(1, 30) g;
INSERT INTO spot (zone_id, code, spot_type)
SELECT 5, 'L-' || LPAD(g::text, 2, '0'),
       CASE WHEN g <= 4 THEN 'compact' ELSE 'standard' END
FROM generate_series(1, 30) g;

INSERT INTO flagged_plate (license_plate, outstanding_balance, reason) VALUES
    ('34DBT999', 47.50, 'card declined on session 142'),
    ('06ZZZ001', 18.00, 'left without paying'),
    ('35XYZ555',  9.20, 'partial payment, $9.20 remaining'),
    ('07AAA777', 62.00, 'multiple unpaid sessions'),
    ('34NEW100', 12.50, 'cash short on exit');

INSERT INTO parking_session (license_plate, spot_id, entry_time, exit_time, total_fee, billed_units, status) VALUES
    ('34ABC111', 1,  NOW() - INTERVAL '5 days 2 hours',   NOW() - INTERVAL '5 days',                  8.00, 2,  'completed'),
    ('06XYZ222', 3,  NOW() - INTERVAL '3 days 6 hours',   NOW() - INTERVAL '3 days 2 hours',         16.00, 4,  'completed'),
    ('34QWE333', 41, NOW() - INTERVAL '2 days 4 hours',   NOW() - INTERVAL '2 days',                 16.00, 4,  'completed'),
    ('35RTY444', 81, NOW() - INTERVAL '1 day 1 hour',     NOW() - INTERVAL '1 day',                   9.00, 45, 'completed'),
    ('07ASD555', 111, NOW() - INTERVAL '12 hours',        NOW() - INTERVAL '8 hours',                40.00, 240,'completed'),
    ('34ZXC666', 121, NOW() - INTERVAL '6 hours',         NOW() - INTERVAL '4 hours',                 4.00, 2,  'completed');

INSERT INTO parking_session (license_plate, spot_id, entry_time, status) VALUES
    ('34LIVE01', 2,   NOW() - INTERVAL '35 minutes', 'active'),
    ('06LIVE02', 42,  NOW() - INTERVAL '1 hour 12 minutes', 'active'),
    ('35LIVE03', 82,  NOW() - INTERVAL '20 minutes', 'active'),
    ('34LIVE04', 112, NOW() - INTERVAL '3 hours 5 minutes', 'active');

UPDATE spot SET status = 'occupied' WHERE id IN (2, 42, 82, 112);
UPDATE spot SET status = 'out_of_service' WHERE id IN (10, 50);
