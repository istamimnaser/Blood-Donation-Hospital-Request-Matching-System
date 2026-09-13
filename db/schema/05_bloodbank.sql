-- Blood bank: per-hospital inventory of blood units in stock. Stock is
-- filled by completed donations (automatically) and manual entries (e.g.
-- external supply), and drawn down when a hospital uses stock against one
-- of its own requests. bloodbank_stock only ever holds the running total
-- per (hospital, blood group); bloodbank_transactions is the full ledger
-- of every addition and withdrawal behind that total.

CREATE TABLE bloodbank_stock (
    stock_id         SERIAL PRIMARY KEY,
    hospital_id      INTEGER NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id   INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    units_available  INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hospital_id, blood_group_id)
);

CREATE TABLE bloodbank_transactions (
    transaction_id    SERIAL PRIMARY KEY,
    hospital_id       INTEGER NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id    INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    transaction_type  VARCHAR(20) NOT NULL
                           CHECK (transaction_type IN ('donation_in', 'manual_in', 'withdrawal')),
    units             INTEGER NOT NULL CHECK (units > 0),
    donation_id       INTEGER REFERENCES donations(donation_id),
    request_id        INTEGER REFERENCES blood_requests(request_id),
    note              VARCHAR(200),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bloodbank_stock_hospital ON bloodbank_stock(hospital_id);
CREATE INDEX idx_bloodbank_transactions_hospital ON bloodbank_transactions(hospital_id, created_at DESC);

-- Every donation tied to a request adds its units to that request's
-- hospital's stock. The donor's blood group is what actually goes in the
-- fridge (not the request's) -- a compatible-but-different group can
-- fulfil a request while banking as its own group.
CREATE OR REPLACE FUNCTION fn_bloodbank_add_from_donation() RETURNS TRIGGER AS $$
DECLARE
    v_hospital_id    INTEGER;
    v_blood_group_id INTEGER;
BEGIN
    SELECT r.hospital_id INTO v_hospital_id
    FROM blood_requests r WHERE r.request_id = NEW.request_id;

    SELECT d.blood_group_id INTO v_blood_group_id
    FROM donors d WHERE d.donor_id = NEW.donor_id;

    INSERT INTO bloodbank_stock (hospital_id, blood_group_id, units_available)
    VALUES (v_hospital_id, v_blood_group_id, NEW.units_donated)
    ON CONFLICT (hospital_id, blood_group_id)
    DO UPDATE SET units_available = bloodbank_stock.units_available + EXCLUDED.units_available,
                  updated_at = NOW();

    INSERT INTO bloodbank_transactions (hospital_id, blood_group_id, transaction_type, units, donation_id, request_id)
    VALUES (v_hospital_id, v_blood_group_id, 'donation_in', NEW.units_donated, NEW.donation_id, NEW.request_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloodbank_add_from_donation
AFTER INSERT ON donations
FOR EACH ROW WHEN (NEW.request_id IS NOT NULL)
EXECUTE FUNCTION fn_bloodbank_add_from_donation();

-- Manual stock addition -- e.g. blood received from an external supply
-- rather than through the donor-matching flow.
CREATE OR REPLACE PROCEDURE sp_bloodbank_add_stock(
    p_hospital_id    INTEGER,
    p_blood_group_id INTEGER,
    p_units          INTEGER,
    p_note           VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_units <= 0 THEN
        RAISE EXCEPTION 'Units must be positive';
    END IF;

    INSERT INTO bloodbank_stock (hospital_id, blood_group_id, units_available)
    VALUES (p_hospital_id, p_blood_group_id, p_units)
    ON CONFLICT (hospital_id, blood_group_id)
    DO UPDATE SET units_available = bloodbank_stock.units_available + EXCLUDED.units_available,
                  updated_at = NOW();

    INSERT INTO bloodbank_transactions (hospital_id, blood_group_id, transaction_type, units, note)
    VALUES (p_hospital_id, p_blood_group_id, 'manual_in', p_units, p_note);
END;
$$;

-- Draws stock down when a hospital uses banked blood for one of its own
-- requests. Rejects the call if the request isn't theirs, or if there
-- isn't enough on hand. FOR UPDATE locks the stock row so two concurrent
-- withdrawals can't both pass the units-available check.
CREATE OR REPLACE PROCEDURE sp_bloodbank_withdraw(
    p_hospital_id    INTEGER,
    p_blood_group_id INTEGER,
    p_units          INTEGER,
    p_request_id     INTEGER,
    p_note           VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_available INTEGER;
BEGIN
    IF p_units <= 0 THEN
        RAISE EXCEPTION 'Units must be positive';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM blood_requests WHERE request_id = p_request_id AND hospital_id = p_hospital_id
    ) THEN
        RAISE EXCEPTION 'Request % does not belong to hospital %', p_request_id, p_hospital_id;
    END IF;

    SELECT units_available INTO v_available
    FROM bloodbank_stock
    WHERE hospital_id = p_hospital_id AND blood_group_id = p_blood_group_id
    FOR UPDATE;

    IF v_available IS NULL OR v_available < p_units THEN
        RAISE EXCEPTION 'Not enough units in stock: have %, need %', COALESCE(v_available, 0), p_units;
    END IF;

    UPDATE bloodbank_stock
       SET units_available = units_available - p_units,
           updated_at = NOW()
     WHERE hospital_id = p_hospital_id AND blood_group_id = p_blood_group_id;

    INSERT INTO bloodbank_transactions (hospital_id, blood_group_id, transaction_type, units, request_id, note)
    VALUES (p_hospital_id, p_blood_group_id, 'withdrawal', p_units, p_request_id, p_note);
END;
$$;

-- Reporting views

CREATE VIEW v_bloodbank_inventory AS
SELECT s.stock_id, s.hospital_id, h.name AS hospital_name,
       bg.group_name AS blood_group, s.units_available, s.updated_at
FROM bloodbank_stock s
JOIN hospitals h ON h.hospital_id = s.hospital_id
JOIN blood_groups bg ON bg.blood_group_id = s.blood_group_id
WHERE s.units_available > 0
ORDER BY h.name, bg.group_name;

CREATE VIEW v_bloodbank_transactions AS
SELECT t.transaction_id, t.hospital_id, h.name AS hospital_name,
       bg.group_name AS blood_group, t.transaction_type, t.units,
       t.donation_id, t.request_id, t.note, t.created_at
FROM bloodbank_transactions t
JOIN hospitals h ON h.hospital_id = t.hospital_id
JOIN blood_groups bg ON bg.blood_group_id = t.blood_group_id
ORDER BY t.created_at DESC;
