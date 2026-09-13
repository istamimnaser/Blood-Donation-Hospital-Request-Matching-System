
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


-- Community Requests: a donor's own broadcast requests, with whichever
-- hospital response was accepted (if any).
SELECT dr.donor_request_id, dr.status, bg.group_name AS blood_group,
       dr.units_needed, dr.urgency, dr.reason, dr.created_at,
       h.name AS accepted_by_hospital
FROM donor_requests dr
JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
LEFT JOIN donor_request_responses drr
       ON drr.donor_request_id = dr.donor_request_id AND drr.status = 'accepted'
LEFT JOIN hospitals h ON h.hospital_id = drr.hospital_id
WHERE dr.donor_id = 1
ORDER BY dr.created_at DESC;


-- Open donor_requests for hospitals to browse.
SELECT dr.donor_request_id, d.full_name AS donor_name, bg.group_name AS blood_group,
       dr.units_needed, dr.urgency, dr.reason, dr.created_at
FROM donor_requests dr
JOIN donors d ON d.donor_id = dr.donor_id
JOIN blood_groups bg ON bg.blood_group_id = dr.blood_group_id
WHERE dr.status = 'pending'
ORDER BY dr.urgency = 'emergency' DESC, dr.created_at;
