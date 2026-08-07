
SELECT * FROM fn_eligible_donors(1);


SELECT * FROM v_pending_emergency_requests;


SELECT * FROM v_donation_history;


SELECT * FROM v_hospital_summary;


SELECT * FROM v_request_fulfillment;


SELECT * FROM notifications
WHERE recipient_type = 'donor' AND recipient_id = 1 AND is_read = FALSE
ORDER BY created_at DESC;


SELECT * FROM audit_logs
WHERE table_name = 'donors' AND record_id = 1
ORDER BY changed_at;
