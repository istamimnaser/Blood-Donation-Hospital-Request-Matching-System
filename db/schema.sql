-- Blood Donation & Hospital Request Matching System
-- Full schema per the project ERD: lookup tables, core entities, the
-- donor<->request bridge table, and the supporting history/audit tables.
-- Safe to re-run: drops and recreates everything in dependency order.

-- =======================================================================
-- PERSON 1 START
-- Summary (easy English): This part builds the basic tables of the
-- database. First it removes any old tables so the script can be run
-- again safely. Then it creates the small "lookup" tables (blood groups,
-- city/area locations, and the donor-to-recipient compatibility chart)
-- and the main tables (donors, hospitals, blood requests, the donor<->
-- request match table, and donations), with their primary keys, foreign
-- keys, and basic validation rules (CHECK constraints).
-- =======================================================================

DROP VIEW IF EXISTS v_request_fulfillment CASCADE;
DROP VIEW IF EXISTS v_hospital_summary CASCADE;
DROP VIEW IF EXISTS v_donation_history CASCADE;
DROP VIEW IF EXISTS v_pending_emergency_requests CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS donor_availability CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS request_matches CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS blood_compatibility CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS blood_groups CASCADE;

-- ---------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------

CREATE TABLE blood_groups (
    blood_group_id  SERIAL PRIMARY KEY,
    group_name      VARCHAR(3) NOT NULL UNIQUE
                        CHECK (group_name IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'))
);

CREATE TABLE locations (
    location_id  SERIAL PRIMARY KEY,
    city         VARCHAR(100) NOT NULL,
    area         VARCHAR(100) NOT NULL,
    UNIQUE (city, area)
);

-- Donor -> recipient compatibility chart, stored as data rather than
-- hard-coded in application code so eligibility queries can join on it.
CREATE TABLE blood_compatibility (
    donor_blood_group_id      INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    recipient_blood_group_id  INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    PRIMARY KEY (donor_blood_group_id, recipient_blood_group_id)
);

-- ---------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------

CREATE TABLE donors (
    donor_id           SERIAL PRIMARY KEY,
    full_name          VARCHAR(120) NOT NULL,
    email              VARCHAR(150) UNIQUE,
    phone              VARCHAR(20) NOT NULL,
    blood_group_id     INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    location_id        INTEGER NOT NULL REFERENCES locations(location_id),
    date_of_birth      DATE,
    is_available       BOOLEAN NOT NULL DEFAULT TRUE,
    last_donation_date DATE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE hospitals (
    hospital_id    SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    location_id    INTEGER NOT NULL REFERENCES locations(location_id),
    contact_phone  VARCHAR(20) NOT NULL,
    email          VARCHAR(150),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE blood_requests (
    request_id      SERIAL PRIMARY KEY,
    hospital_id     INTEGER NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id  INTEGER NOT NULL REFERENCES blood_groups(blood_group_id),
    units_needed    INTEGER NOT NULL CHECK (units_needed > 0),
    units_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
    urgency         VARCHAR(10) NOT NULL DEFAULT 'medium'
                        CHECK (urgency IN ('low','medium','high','emergency')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','partially_fulfilled','fulfilled','cancelled')),
    needed_by       DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bridge table: many-to-many between donors and blood_requests.
CREATE TABLE request_matches (
    match_id      SERIAL PRIMARY KEY,
    request_id    INTEGER NOT NULL REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    donor_id      INTEGER NOT NULL REFERENCES donors(donor_id),
    match_status  VARCHAR(20) NOT NULL DEFAULT 'suggested'
                      CHECK (match_status IN ('suggested','accepted','declined','completed')),
    matched_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, donor_id)
);

CREATE TABLE donations (
    donation_id     SERIAL PRIMARY KEY,
    donor_id        INTEGER NOT NULL REFERENCES donors(donor_id),
    request_id      INTEGER REFERENCES blood_requests(request_id),
    units_donated   INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
    donation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =======================================================================
-- PERSON 1 END
-- =======================================================================

-- =======================================================================
-- PERSON 2 START
-- Summary (easy English): This part adds the extra tables that keep a
-- history of what happens in the system: donor_availability (logs every
-- time a donor turns their availability on/off), notifications (messages
-- sent to donors/hospitals), and audit_logs (a record of every insert,
-- update, and delete on the important tables). It also adds indexes so
-- common lookups run faster, and writes the main matching function,
-- fn_eligible_donors, which finds and ranks the donors who qualify for a
-- given blood request.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Supporting tables (history / notifications / audit)
-- ---------------------------------------------------------------------

-- History of availability toggles, so "was this donor available on date X"
-- is answerable instead of only the current donors.is_available flag.
CREATE TABLE donor_availability (
    availability_id  SERIAL PRIMARY KEY,
    donor_id         INTEGER NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    is_available     BOOLEAN NOT NULL,
    changed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    note             VARCHAR(200)
);

-- recipient_type + recipient_id is a polymorphic reference (donor or
-- hospital); fn_validate_notification_recipient() below enforces it
-- actually points at an existing row, since a plain FK can't span two
-- target tables.
CREATE TABLE notifications (
    notification_id    SERIAL PRIMARY KEY,
    recipient_type      VARCHAR(10) NOT NULL CHECK (recipient_type IN ('donor','hospital')),
    recipient_id         INTEGER NOT NULL,
    request_id          INTEGER REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    match_id            INTEGER REFERENCES request_matches(match_id) ON DELETE CASCADE,
    notification_type   VARCHAR(30) NOT NULL
                             CHECK (notification_type IN ('request_created','match_suggested','donation_confirmed')),
    message              TEXT NOT NULL,
    is_read              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    audit_id     BIGSERIAL PRIMARY KEY,
    table_name   VARCHAR(50) NOT NULL,
    record_id    INTEGER NOT NULL,
    action       VARCHAR(10) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    old_data     JSONB,
    new_data     JSONB,
    changed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_donors_blood_group ON donors(blood_group_id);
CREATE INDEX idx_donors_location ON donors(location_id);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_requests_urgency ON blood_requests(urgency);
CREATE INDEX idx_matches_request ON request_matches(request_id);
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donor_availability_donor ON donor_availability(donor_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------

-- Ranked donor pool for a given request: compatible blood group, available,
-- and past the 90-day rest period. Same-location and exact-blood-group
-- matches are ranked first.
CREATE OR REPLACE FUNCTION fn_eligible_donors(p_request_id INTEGER)
RETURNS TABLE (
    donor_id             INTEGER,
    full_name            VARCHAR,
    phone                VARCHAR,
    blood_group          VARCHAR,
    city                 VARCHAR,
    area                 VARCHAR,
    last_donation_date   DATE,
    same_location        BOOLEAN,
    exact_blood_group    BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.donor_id, d.full_name, d.phone, bg.group_name, l.city, l.area,
           d.last_donation_date,
           (d.location_id = h.location_id) AS same_location,
           (d.blood_group_id = r.blood_group_id) AS exact_blood_group
    FROM blood_requests r
    JOIN hospitals h ON h.hospital_id = r.hospital_id
    JOIN blood_compatibility bc ON bc.recipient_blood_group_id = r.blood_group_id
    JOIN donors d ON d.blood_group_id = bc.donor_blood_group_id
    JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE r.request_id = p_request_id
      AND d.is_available = TRUE
      AND (d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')
    ORDER BY same_location DESC, exact_blood_group DESC, d.last_donation_date NULLS FIRST;
END;
$$ LANGUAGE plpgsql;


-- =======================================================================
-- PERSON 2 END
-- =======================================================================

-- =======================================================================
-- PERSON 3 START
-- Summary (easy English): This part makes the database react on its own
-- when data changes (triggers). When a donation is added, it updates the
-- donor's last donation date, updates how much of the request is
-- fulfilled, marks the match as completed, and sends the donor a thank-you
-- notification. It also logs every time a donor's availability changes,
-- notifies a hospital when an emergency request is created, notifies a
-- donor when they are matched to a request, checks that every
-- notification is actually sent to a real donor or hospital, and keeps an
-- audit trail of every insert/update/delete on the main tables.
-- =======================================================================


-- After a donation is recorded: roll last_donation_date forward, fold the
-- donated units into the parent request's fulfillment status, mark the
-- donor's match completed, and notify the donor.
CREATE OR REPLACE FUNCTION fn_apply_donation() RETURNS TRIGGER AS $$
BEGIN
    UPDATE donors
       SET last_donation_date = NEW.donation_date
     WHERE donor_id = NEW.donor_id;

    IF NEW.request_id IS NOT NULL THEN
        UPDATE blood_requests
           SET units_fulfilled = units_fulfilled + NEW.units_donated,
               status = CASE
                            WHEN units_fulfilled + NEW.units_donated >= units_needed THEN 'fulfilled'
                            ELSE 'partially_fulfilled'
                        END
         WHERE request_id = NEW.request_id;

        UPDATE request_matches
           SET match_status = 'completed'
         WHERE request_id = NEW.request_id AND donor_id = NEW.donor_id;
    END IF;

    INSERT INTO notifications (recipient_type, recipient_id, request_id, notification_type, message)
    VALUES ('donor', NEW.donor_id, NEW.request_id, 'donation_confirmed',
            'Thank you for your donation of ' || NEW.units_donated || ' unit(s).');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_donation
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION fn_apply_donation();

-- Every change to donors.is_available is logged as a history row, so an
-- initial row is also written on registration (OLD is NULL there).
CREATE OR REPLACE FUNCTION fn_log_donor_availability() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.is_available IS DISTINCT FROM NEW.is_available THEN
        INSERT INTO donor_availability (donor_id, is_available, note)
        VALUES (NEW.donor_id, NEW.is_available,
                CASE WHEN TG_OP = 'INSERT' THEN 'initial registration' ELSE 'status changed' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donor_availability_insert
AFTER INSERT ON donors
FOR EACH ROW EXECUTE FUNCTION fn_log_donor_availability();

CREATE TRIGGER trg_donor_availability_update
AFTER UPDATE OF is_available ON donors
FOR EACH ROW EXECUTE FUNCTION fn_log_donor_availability();

-- Notify the hospital when one of its requests is created as an emergency.
CREATE OR REPLACE FUNCTION fn_notify_emergency_request() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (recipient_type, recipient_id, request_id, notification_type, message)
    VALUES ('hospital', NEW.hospital_id, NEW.request_id, 'request_created',
            'Emergency request created for ' ||
            (SELECT group_name FROM blood_groups WHERE blood_group_id = NEW.blood_group_id) ||
            ' (' || NEW.units_needed || ' unit(s)).');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_emergency_request
AFTER INSERT ON blood_requests
FOR EACH ROW WHEN (NEW.urgency = 'emergency')
EXECUTE FUNCTION fn_notify_emergency_request();

-- Notify the donor whenever they're suggested for a request.
CREATE OR REPLACE FUNCTION fn_notify_new_match() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (recipient_type, recipient_id, request_id, match_id, notification_type, message)
    VALUES ('donor', NEW.donor_id, NEW.request_id, NEW.match_id, 'match_suggested',
            'You have been matched to a blood request.');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_match
AFTER INSERT ON request_matches
FOR EACH ROW EXECUTE FUNCTION fn_notify_new_match();

-- recipient_id is polymorphic (donor_id or hospital_id depending on
-- recipient_type), which a foreign key can't express directly.
CREATE OR REPLACE FUNCTION fn_validate_notification_recipient() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.recipient_type = 'donor' AND NOT EXISTS (SELECT 1 FROM donors WHERE donor_id = NEW.recipient_id) THEN
        RAISE EXCEPTION 'notifications.recipient_id % does not match an existing donor', NEW.recipient_id;
    ELSIF NEW.recipient_type = 'hospital' AND NOT EXISTS (SELECT 1 FROM hospitals WHERE hospital_id = NEW.recipient_id) THEN
        RAISE EXCEPTION 'notifications.recipient_id % does not match an existing hospital', NEW.recipient_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_notification_recipient
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION fn_validate_notification_recipient();

-- Generic row-change logger, attached per-table below with the primary
-- key column name passed in as the trigger argument.
CREATE OR REPLACE FUNCTION fn_audit_row_change() RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_record_id := (row_to_json(OLD)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, row_to_json(OLD), NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := (row_to_json(NEW)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSE
        v_record_id := (row_to_json(NEW)->>(TG_ARGV[0]))::INTEGER;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, NULL, row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_donors
AFTER INSERT OR UPDATE OR DELETE ON donors
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('donor_id');

CREATE TRIGGER trg_audit_hospitals
AFTER INSERT OR UPDATE OR DELETE ON hospitals
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('hospital_id');

CREATE TRIGGER trg_audit_blood_requests
AFTER INSERT OR UPDATE OR DELETE ON blood_requests
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('request_id');

CREATE TRIGGER trg_audit_donations
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('donation_id');

CREATE TRIGGER trg_audit_request_matches
AFTER INSERT OR UPDATE OR DELETE ON request_matches
FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change('match_id');


-- =======================================================================
-- PERSON 3 END
-- =======================================================================

-- =======================================================================
-- PERSON 4 START
-- Summary (easy English): This part adds easy, safe ways to use the
-- system and to see reports from it. sp_create_match matches a donor to a
-- request (and refuses to do it if the donor isn't actually eligible).
-- sp_record_donation records a donation. The four views turn raw table
-- data into ready-to-read reports: emergency requests still waiting for
-- blood, full donation history, a summary per hospital, and how far each
-- request is toward being fulfilled. At the end, it fills in the starting
-- data: the 8 blood groups and the standard donor-to-recipient
-- compatibility chart.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Procedures
-- ---------------------------------------------------------------------

-- Suggests a donor for a request; rejects the call outright if the donor
-- isn't in that request's eligible pool (see fn_eligible_donors above).
CREATE OR REPLACE PROCEDURE sp_create_match(p_request_id INTEGER, p_donor_id INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM fn_eligible_donors(p_request_id) e WHERE e.donor_id = p_donor_id) THEN
        RAISE EXCEPTION 'Donor % is not eligible for request %', p_donor_id, p_request_id;
    END IF;

    INSERT INTO request_matches (request_id, donor_id)
    VALUES (p_request_id, p_donor_id)
    ON CONFLICT (request_id, donor_id) DO NOTHING;
END;
$$;

-- Records a donation; fn_apply_donation() cascades the fulfillment,
-- last_donation_date, and match-status updates via trigger.
CREATE OR REPLACE PROCEDURE sp_record_donation(
    p_donor_id       INTEGER,
    p_request_id     INTEGER,
    p_units          INTEGER,
    p_donation_date  DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO donations (donor_id, request_id, units_donated, donation_date)
    VALUES (p_donor_id, p_request_id, p_units, p_donation_date);
END;
$$;

-- ---------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------

CREATE VIEW v_pending_emergency_requests AS
SELECT r.request_id, h.name AS hospital_name, l.city, l.area,
       bg.group_name AS blood_group, r.units_needed, r.units_fulfilled,
       r.units_needed - r.units_fulfilled AS units_remaining,
       r.needed_by, r.created_at
FROM blood_requests r
JOIN hospitals h ON h.hospital_id = r.hospital_id
JOIN locations l ON l.location_id = h.location_id
JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
WHERE r.urgency = 'emergency' AND r.status IN ('pending', 'partially_fulfilled')
ORDER BY r.created_at;

CREATE VIEW v_donation_history AS
SELECT don.donation_id, don.donor_id, d.full_name AS donor_name, don.request_id,
       h.name AS hospital_name, don.units_donated, don.donation_date
FROM donations don
JOIN donors d ON d.donor_id = don.donor_id
LEFT JOIN blood_requests r ON r.request_id = don.request_id
LEFT JOIN hospitals h ON h.hospital_id = r.hospital_id
ORDER BY don.donation_date DESC;

CREATE VIEW v_hospital_summary AS
SELECT h.hospital_id, h.name AS hospital_name,
       COUNT(r.request_id) AS total_requests,
       COUNT(*) FILTER (WHERE r.status = 'fulfilled') AS fulfilled_requests,
       COUNT(*) FILTER (WHERE r.status = 'pending') AS pending_requests,
       COUNT(*) FILTER (WHERE r.urgency = 'emergency') AS emergency_requests,
       COALESCE(SUM(r.units_needed), 0) AS total_units_needed,
       COALESCE(SUM(r.units_fulfilled), 0) AS total_units_fulfilled
FROM hospitals h
LEFT JOIN blood_requests r ON r.hospital_id = h.hospital_id
GROUP BY h.hospital_id, h.name;

CREATE VIEW v_request_fulfillment AS
SELECT r.request_id, h.name AS hospital_name, bg.group_name AS blood_group,
       r.units_needed, r.units_fulfilled,
       ROUND(100.0 * r.units_fulfilled / r.units_needed, 1) AS percent_fulfilled,
       r.status, r.urgency, r.needed_by, r.created_at
FROM blood_requests r
JOIN hospitals h ON h.hospital_id = r.hospital_id
JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
ORDER BY r.created_at DESC;

-
    ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');

-- Standard donor -> recipient compatibility chart.
INSERT INTO blood_compatibility (donor_blood_group_id, recipient_blood_group_id)
SELECT d.blood_group_id, r.blood_group_id
FROM blood_groups d
CROSS JOIN blood_groups r
WHERE (d.group_name, r.group_name) IN (
    ('O-','O-'), ('O-','O+'), ('O-','A-'), ('O-','A+'), ('O-','B-'), ('O-','B+'), ('O-','AB-'), ('O-','AB+'),
    ('O+','O+'), ('O+','A+'), ('O+','B+'), ('O+','AB+'),
    ('A-','A-'), ('A-','A+'), ('A-','AB-'), ('A-','AB+'),
    ('A+','A+'), ('A+','AB+'),
    ('B-','B-'), ('B-','B+'), ('B-','AB-'), ('B-','AB+'),
    ('B+','B+'), ('B+','AB+'),
    ('AB-','AB-'), ('AB-','AB+'),
    ('AB+','AB+')
);

