-- Example report queries, exercising the views/functions defined in
-- schema.sql. Meant for demo/manual use (psql, pgAdmin), not application code.

-- Eligible donor list for a specific request (ranked: same location and
-- exact blood-group match first).
SELECT * FROM fn_eligible_donors(1);

-- Pending emergency requests.
SELECT * FROM v_pending_emergency_requests;

-- Donation history.
SELECT * FROM v_donation_history;

-- Hospital activity summary.
SELECT * FROM v_hospital_summary;

-- Request fulfillment report.
SELECT * FROM v_request_fulfillment;

-- Unread notifications for a given donor.
SELECT * FROM notifications
WHERE recipient_type = 'donor' AND recipient_id = 1 AND is_read = FALSE
ORDER BY created_at DESC;

-- Full change history for a given donor (audit trail).
SELECT * FROM audit_logs
WHERE table_name = 'donors' AND record_id = 1
ORDER BY changed_at;
