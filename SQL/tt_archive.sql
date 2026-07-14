SELECT MIN(dt) from tt_event

SELECT COUNT(*) FROM tt_event;
SELECT COUNT(*) FROM tt_event_archive;

SELECT COUNT(*) FROM tt_event WHERE dt < '2026-01-01 00:00:00';

INSERT INTO tt_event_archive ( dt, dtend, idplace, idstep, idworker, hu )

SELECT dt, dtend, idplace, idstep, idworker, hu 
FROM tt_event 
 WHERE dt < '2026-01-01 00:00:00'
 
DELETE FROM tt_event WHERE dt < '2026-01-01 00:00:00';
 
