-- Procedures, reporting views, and lookup data

-- The 3-arg version below is a distinct overload from the original 2-arg
-- signature (CREATE OR REPLACE matches on argument types, so it can't
-- collapse the two) -- drop the old one explicitly so schema.sql stays
-- safe to re-run without leaving a stale overload around, same reasoning
-- as the fn_eligible_donors guard above.
DROP PROCEDURE IF EXISTS sp_create_match(INTEGER, INTEGER);

-- Suggests a donor for a request; rejects the call outright if the donor
-- isn't in that request's eligible pool (see fn_eligible_donors above).
-- p_initial_status defaults to 'suggested' (hospital-initiated, needs the
-- donor's accept/decline) so existing 2-arg callers are unaffected; donor
-- self-nomination ("I can help") passes 'accepted' since the donor is
-- volunteering themselves and there's no one left to accept on their behalf.
CREATE OR REPLACE PROCEDURE sp_create_match(
    p_request_id     INTEGER,
    p_donor_id       INTEGER,
    p_initial_status VARCHAR DEFAULT 'suggested'
)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM fn_eligible_donors(p_request_id) e WHERE e.donor_id = p_donor_id) THEN
        RAISE EXCEPTION 'Donor % is not eligible for request %', p_donor_id, p_request_id;
    END IF;

    INSERT INTO request_matches (request_id, donor_id, match_status)
    VALUES (p_request_id, p_donor_id, p_initial_status)
    ON CONFLICT (request_id, donor_id) DO NOTHING;
END;
$$;

-- Closes out a donor_request once the hospital that accepted it has
-- actually taken the donation -- the sp_record_donation-equivalent
-- completion step. Kept as an explicit procedure (rather than another
-- trigger) since there's no donations-equivalent table insert for donor
-- initiated requests to hang a trigger off of.
CREATE OR REPLACE PROCEDURE sp_fulfill_donor_request(p_donor_request_id INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE donor_requests
       SET status = 'fulfilled'
     WHERE donor_request_id = p_donor_request_id
       AND status = 'accepted';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor request % is not in accepted status', p_donor_request_id;
    END IF;
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

-- Reporting views
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

-- Lookup data

INSERT INTO blood_groups (group_name) VALUES
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
