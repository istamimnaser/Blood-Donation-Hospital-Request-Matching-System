-- Entry point: runs the schema files in dependency order.
-- Each file also stands on its own if you need to re-run just one part.
--   01_core_tables.sql           drops + core tables (blood_groups, locations, donors, hospitals, blood_requests, ...)
--   02_support_and_functions.sql supporting tables (donor_availability, notifications, audit_logs), indexes, fn_eligible_donors
--   03_triggers.sql              triggers + trigger functions
--   04_procedures_views_data.sql procedures, reporting views, lookup data

\ir schema/01_core_tables.sql
\ir schema/02_support_and_functions.sql
\ir schema/03_triggers.sql
\ir schema/04_procedures_views_data.sql
