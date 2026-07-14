SELECT MIN(dt) from ta_event

SELECT COUNT(*) FROM ta_event;
SELECT COUNT(*) FROM ta_event_archive;

SELECT COUNT(*) FROM ta_event WHERE dt < '2026-01-01 00:00:00';

INSERT INTO ta_event_archive ( idworker, dt, duration )

SELECT idworker, dt, duration 
FROM ta_event 
 WHERE dt < '2026-01-01 00:00:00'
 
DELETE FROM ta_event WHERE dt < '2026-01-01 00:00:00';
 
