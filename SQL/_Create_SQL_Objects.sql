-- Combined SQL object creation script
-- Generated from SQL/*.sql object files only
DELIMITER ;

-- Cleanup obsolete objects removed from the application.
SET @drop_object_sql = (
  SELECT IF(COUNT(*) > 0, 'DROP VIEW `tt_v_active_orders`', 'SELECT 1')
    FROM information_schema.views
   WHERE table_schema = DATABASE()
     AND table_name = 'tt_v_active_orders'
);
PREPARE drop_object_stmt FROM @drop_object_sql;
EXECUTE drop_object_stmt;
DEALLOCATE PREPARE drop_object_stmt;
SET @drop_object_sql = NULL;

-- Performance indexes used by event-heavy reports, HU/order screens, and active task queries.
SET @drop_object_sql = (
  SELECT IF(COUNT(*) > 0, 'DROP PROCEDURE `_add_index_if_missing`', 'SELECT 1')
    FROM information_schema.routines
   WHERE routine_schema = DATABASE()
     AND routine_name = '_add_index_if_missing'
     AND routine_type = 'PROCEDURE'
);
PREPARE drop_object_stmt FROM @drop_object_sql;
EXECUTE drop_object_stmt;
DEALLOCATE PREPARE drop_object_stmt;
SET @drop_object_sql = NULL;
DELIMITER //
CREATE PROCEDURE _add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_columns TEXT
)
BEGIN
  DECLARE v_table_exists INT DEFAULT 0;
  DECLARE v_index_exists INT DEFAULT 0;
  DECLARE v_same_columns_exists INT DEFAULT 0;
  DECLARE v_column_exists INT DEFAULT 0;
  DECLARE v_missing_columns INT DEFAULT 0;
  DECLARE v_normalized_columns TEXT;
  DECLARE v_remaining_columns TEXT;
  DECLARE v_column_name VARCHAR(64);
  DECLARE v_comma_pos INT DEFAULT 0;

  SELECT COUNT(*)
    INTO v_table_exists
    FROM information_schema.tables
   WHERE table_schema = DATABASE()
     AND table_name = p_table_name
     AND table_type = 'BASE TABLE';

  IF v_table_exists > 0 THEN
    SET v_normalized_columns = REPLACE(REPLACE(REPLACE(p_index_columns, '`', ''), ' ', ''), '\n', '');
    SET v_remaining_columns = v_normalized_columns;

    WHILE v_remaining_columns <> '' DO
      SET v_comma_pos = LOCATE(',', v_remaining_columns);
      IF v_comma_pos = 0 THEN
        SET v_column_name = v_remaining_columns;
        SET v_remaining_columns = '';
      ELSE
        SET v_column_name = SUBSTRING(v_remaining_columns, 1, v_comma_pos - 1);
        SET v_remaining_columns = SUBSTRING(v_remaining_columns, v_comma_pos + 1);
      END IF;

      SELECT COUNT(*)
        INTO v_column_exists
        FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = p_table_name
         AND column_name = v_column_name;

      IF v_column_exists = 0 THEN
        SET v_missing_columns = v_missing_columns + 1;
      END IF;
    END WHILE;

    SELECT COUNT(*)
      INTO v_index_exists
      FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = p_table_name
       AND index_name = p_index_name;

    SELECT COUNT(*)
      INTO v_same_columns_exists
      FROM (
        SELECT index_name
          FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = p_table_name
         GROUP BY index_name
        HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') = v_normalized_columns
      ) existing_index_columns;

    IF v_index_exists = 0 AND v_same_columns_exists = 0 AND v_missing_columns = 0 THEN
      SET @add_index_sql = CONCAT(
        'ALTER TABLE `', REPLACE(p_table_name, '`', '``'),
        '` ADD INDEX `', REPLACE(p_index_name, '`', '``'),
        '` (', p_index_columns, ')'
      );
      PREPARE add_index_stmt FROM @add_index_sql;
      EXECUTE add_index_stmt;
      DEALLOCATE PREPARE add_index_stmt;
    END IF;
  END IF;
END//
DELIMITER ;

CALL _add_index_if_missing('tt_event', 'idx_tt_event_hu_step_dtend', '`hu`, `idstep`, `dtend`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_hu_dt', '`hu`, `dt`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_dt', '`dt`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_worker_dt', '`idworker`, `dt`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_place_dt', '`idplace`, `dt`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_step_dt', '`idstep`, `dt`');
CALL _add_index_if_missing('tt_event', 'idx_tt_event_hu_dtend', '`hu`, `dtend`');

CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_hu_step', '`hu`, `idstep`');
CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_hu_dt', '`hu`, `dt`');
CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_dt', '`dt`');
CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_worker_dt', '`idworker`, `dt`');
CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_place_dt', '`idplace`, `dt`');
CALL _add_index_if_missing('tt_event_archive', 'idx_ttea_step_dt', '`idstep`, `dt`');

CALL _add_index_if_missing('hu', 'idx_hu_idorder', '`idorder`');
CALL _add_index_if_missing('hu', 'idx_hu_idstep_grp', '`idstep_grp`');
CALL _add_index_if_missing('hu', 'idx_hu_order_step_grp', '`idorder`, `idstep_grp`');

CALL _add_index_if_missing('process', 'idx_process_grp_n_step', '`idstep_grp`, `n`, `idstep`');
CALL _add_index_if_missing('process', 'idx_process_grp_step', '`idstep_grp`, `idstep`');
CALL _add_index_if_missing('plan', 'idx_plan_product_grp_step_grp', '`idproduct_grp`, `idstep_grp`');

CALL _add_index_if_missing('order', 'idx_order_ymd_product', '`ymd`, `idproduct`');
CALL _add_index_if_missing('order', 'idx_order_d_product', '`d`, `idproduct`');
CALL _add_index_if_missing('order', 'idx_order_idproduct', '`idproduct`');

CALL _add_index_if_missing('product', 'idx_product_sgrp', '`idproduct_sgrp`');
CALL _add_index_if_missing('product_sgrp', 'idx_product_sgrp_grp', '`idproduct_grp`');
CALL _add_index_if_missing('tt_place', 'idx_tt_place_idstep', '`idstep`');
CALL _add_index_if_missing('worker', 'idx_worker_idgrp', '`idgrp`');
CALL _add_index_if_missing('worker', 'idx_worker_nr', '`nr`');

CALL _add_index_if_missing('ta_event', 'idx_ta_event_worker_dt', '`idworker`, `dt`');
CALL _add_index_if_missing('ta_event', 'idx_ta_event_dt', '`dt`');
CALL _add_index_if_missing('ta_event_archive', 'idx_taa_event_worker_dt', '`idworker`, `dt`');
CALL _add_index_if_missing('ta_event_archive', 'idx_taa_event_dt', '`dt`');

CALL _add_index_if_missing('wh_doc', 'idx_wh_doc_dt', '`dt`');
CALL _add_index_if_missing('wh_doc', 'idx_wh_doc_worker_dt', '`idworker`, `dt`');
CALL _add_index_if_missing('wh_doc_item', 'idx_wh_doc_item_doc', '`iddoc`');
CALL _add_index_if_missing('wh_doc_item', 'idx_wh_doc_item_item_doc', '`iditem`, `iddoc`');
CALL _add_index_if_missing('wh_order', 'idx_wh_order_worker_item', '`idworker`, `iditem`');
CALL _add_index_if_missing('wh_item', 'idx_wh_item_grp', '`idgrp`');
CALL _add_index_if_missing('wh_grp', 'idx_wh_grp_parent', '`parent_grp_id`');

SET @drop_object_sql = (
  SELECT IF(COUNT(*) > 0, 'DROP PROCEDURE `_add_index_if_missing`', 'SELECT 1')
    FROM information_schema.routines
   WHERE routine_schema = DATABASE()
     AND routine_name = '_add_index_if_missing'
     AND routine_type = 'PROCEDURE'
);
PREPARE drop_object_stmt FROM @drop_object_sql;
EXECUTE drop_object_stmt;
DEALLOCATE PREPARE drop_object_stmt;
SET @drop_object_sql = NULL;

-- dictionary_delete.sql
DROP PROCEDURE IF EXISTS dictionary_delete;
DELIMITER //
CREATE PROCEDURE dictionary_delete(IN p_dictionary VARCHAR(32), IN p_id INT)
BEGIN
  IF p_dictionary = 'worker' THEN
    DELETE FROM worker_img WHERE idworker = p_id;
    DELETE FROM worker WHERE id > 0 AND id = p_id;
  ELSEIF p_dictionary = 'wh_item' THEN
    DELETE FROM wh_item_img WHERE iditem = p_id;
    DELETE FROM wh_item WHERE id > 0 AND id = p_id;
  ELSEIF p_dictionary = 'kt_meals' THEN
    DELETE FROM kt_meals_img WHERE idmeals = p_id;
    DELETE FROM kt_meals WHERE id > 0 AND id = p_id;
  ELSEIF p_dictionary = 'step' THEN
    DELETE FROM step WHERE id > 0 AND id = p_id;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported dictionary';
  END IF;
END//
DELIMITER ;


-- dictionary_get.sql
DROP PROCEDURE IF EXISTS dictionary_get;
DELIMITER //
CREATE PROCEDURE dictionary_get(
  IN p_dictionary VARCHAR(32),
  IN p_barcode VARCHAR(255),
  IN p_id_body INT,
  IN p_id VARCHAR(255),
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255),
  IN p_idgrp VARCHAR(255),
  IN p_grp VARCHAR(255),
  IN p_vendor VARCHAR(255),
  IN p_itemNo VARCHAR(255),
  IN p_price VARCHAR(255),
  IN p_minQty VARCHAR(255),
  IN p_step_name VARCHAR(255),
  IN p_raw_barcode VARCHAR(255)
)
BEGIN
  IF p_dictionary = 'worker' THEN
    SELECT t.*, i.img
      FROM worker t LEFT JOIN worker_img i ON i.idworker = t.id
     WHERE (p_barcode IS NULL OR UPPER(t.nr) LIKE p_barcode)
       AND (p_id_body IS NULL OR t.id = p_id_body)
       AND (p_id IS NULL OR UPPER(t.id) LIKE CONCAT('%', UPPER(p_id), '%'))
       AND (p_nr IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
       AND (p_name IS NULL OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_name), '%'))
       AND (p_idgrp IS NULL OR UPPER(t.idgrp) LIKE CONCAT('%', UPPER(p_idgrp), '%'))
     ORDER BY 0 + t.nr;
  ELSEIF p_dictionary = 'wh_item' THEN
    SELECT t.*, i.img
      FROM wh_item t LEFT JOIN wh_item_img i ON i.iditem = t.id
     WHERE (p_barcode IS NULL OR UPPER(t.nr) LIKE p_barcode OR UPPER(t.itemNo) LIKE p_barcode)
       AND (p_id_body IS NULL OR t.id = p_id_body)
       AND (p_id IS NULL OR UPPER(t.id) LIKE CONCAT('%', UPPER(p_id), '%'))
       AND (p_nr IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
       AND (p_name IS NULL OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_name), '%'))
       AND (p_grp IS NULL OR UPPER(t.grp) LIKE CONCAT('%', UPPER(p_grp), '%'))
       AND (p_vendor IS NULL OR UPPER(t.vendor) LIKE CONCAT('%', UPPER(p_vendor), '%'))
       AND (p_itemNo IS NULL OR UPPER(t.itemNo) LIKE CONCAT('%', UPPER(p_itemNo), '%'))
       AND (p_price IS NULL OR UPPER(t.price) LIKE CONCAT('%', UPPER(p_price), '%'))
       AND (p_minQty IS NULL OR UPPER(t.minQty) LIKE CONCAT('%', UPPER(p_minQty), '%'))
     ORDER BY IF(p_barcode IS NOT NULL AND t.nr LIKE p_raw_barcode, 0, 1), t.name;
  ELSEIF p_dictionary = 'wh_v_item' THEN
    SELECT t.*, i.img
      FROM wh_v_item t LEFT JOIN wh_item_img i ON i.iditem = t.id
     WHERE (p_barcode IS NULL OR UPPER(t.nr) LIKE p_barcode)
       AND (p_id_body IS NULL OR t.id = p_id_body)
       AND (p_id IS NULL OR UPPER(t.id) LIKE CONCAT('%', UPPER(p_id), '%'))
       AND (p_nr IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
       AND (p_name IS NULL OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_name), '%'))
       AND (p_grp IS NULL OR UPPER(t.grp) LIKE CONCAT('%', UPPER(p_grp), '%'))
       AND (p_vendor IS NULL OR UPPER(t.vendor) LIKE CONCAT('%', UPPER(p_vendor), '%'))
       AND (p_itemNo IS NULL OR UPPER(t.itemNo) LIKE CONCAT('%', UPPER(p_itemNo), '%'))
       AND (p_price IS NULL OR UPPER(t.price) LIKE CONCAT('%', UPPER(p_price), '%'))
       AND (p_minQty IS NULL OR UPPER(t.minQty) LIKE CONCAT('%', UPPER(p_minQty), '%'))
     ORDER BY t.name;
  ELSEIF p_dictionary = 'kt_meals' THEN
    SELECT t.*, i.img
      FROM kt_meals t LEFT JOIN kt_meals_img i ON i.idmeals = t.id
     WHERE (p_barcode IS NULL OR UPPER(t.nr) LIKE p_barcode)
       AND (p_id_body IS NULL OR t.id = p_id_body)
       AND (p_id IS NULL OR UPPER(t.id) LIKE CONCAT('%', UPPER(p_id), '%'))
       AND (p_nr IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
       AND (p_name IS NULL OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_name), '%'))
       AND (p_grp IS NULL OR UPPER(t.grp) LIKE CONCAT('%', UPPER(p_grp), '%'))
     ORDER BY t.grp, t.nr;
  ELSEIF p_dictionary = 'step' THEN
    SELECT t.*
      FROM step t
     WHERE (p_barcode IS NULL OR UPPER(t.nr) LIKE p_barcode)
       AND (p_id_body IS NULL OR t.id = p_id_body)
       AND (p_id IS NULL OR UPPER(t.id) LIKE CONCAT('%', UPPER(p_id), '%'))
       AND (p_nr IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
       AND (p_name IS NULL OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_name), '%'))
       AND (p_step_name IS NULL OR UPPER(t.nr) LIKE CONCAT('%', UPPER(p_step_name), '%') OR UPPER(t.name) LIKE CONCAT('%', UPPER(p_step_name), '%'))
     ORDER BY t.nr;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported dictionary';
  END IF;
END//
DELIMITER ;


-- dictionary_update_img.sql
DROP PROCEDURE IF EXISTS dictionary_update_img;
DELIMITER //
CREATE PROCEDURE dictionary_update_img(IN p_dictionary VARCHAR(32), IN p_nr VARCHAR(255), IN p_img LONGTEXT)
BEGIN
  IF p_dictionary = 'worker' THEN
    INSERT INTO worker_img (idworker, img)
    VALUES ((SELECT id FROM worker WHERE UPPER(nr) LIKE UPPER(p_nr)), p_img)
    ON DUPLICATE KEY UPDATE img = VALUES(img);
  ELSEIF p_dictionary IN ('wh_item', 'wh_v_item') THEN
    INSERT INTO wh_item_img (iditem, img)
    VALUES ((SELECT id FROM wh_item WHERE UPPER(nr) LIKE UPPER(p_nr)), p_img)
    ON DUPLICATE KEY UPDATE img = VALUES(img);
  ELSEIF p_dictionary = 'kt_meals' THEN
    INSERT INTO kt_meals_img (idmeals, img)
    VALUES ((SELECT id FROM kt_meals WHERE UPPER(nr) LIKE UPPER(p_nr)), p_img)
    ON DUPLICATE KEY UPDATE img = VALUES(img);
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported dictionary image';
  END IF;
END//
DELIMITER ;


-- dictionary_upsert.sql
DROP PROCEDURE IF EXISTS dictionary_upsert;
DELIMITER //
CREATE PROCEDURE dictionary_upsert(
  IN p_dictionary VARCHAR(32),
  IN p_id INT,
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255),
  IN p_idgrp INT,
  IN p_grp VARCHAR(255),
  IN p_vendor VARCHAR(255),
  IN p_itemNo VARCHAR(255),
  IN p_price DECIMAL(18,6),
  IN p_minQty DECIMAL(18,6),
  IN p_cash DECIMAL(18,6),
  IN p_disabled TINYINT
)
BEGIN
  IF p_dictionary = 'worker' THEN
    INSERT INTO worker (id, nr, name, idgrp) VALUES (p_id, p_nr, p_name, p_idgrp)
    ON DUPLICATE KEY UPDATE nr = VALUES(nr), name = VALUES(name), idgrp = VALUES(idgrp);
  ELSEIF p_dictionary = 'wh_item' THEN
    INSERT INTO wh_item (id, nr, name, grp, vendor, itemNo, price, minQty)
    VALUES (p_id, p_nr, p_name, p_grp, p_vendor, p_itemNo, p_price, p_minQty)
    ON DUPLICATE KEY UPDATE nr=VALUES(nr), name=VALUES(name), grp=VALUES(grp), vendor=VALUES(vendor), itemNo=VALUES(itemNo), price=VALUES(price), minQty=VALUES(minQty);
  ELSEIF p_dictionary = 'kt_meals' THEN
    INSERT INTO kt_meals (id, nr, name, grp, price, cash, disabled)
    VALUES (p_id, p_nr, p_name, p_grp, p_price, p_cash, p_disabled)
    ON DUPLICATE KEY UPDATE nr=VALUES(nr), name=VALUES(name), grp=VALUES(grp), price=VALUES(price), cash=VALUES(cash), disabled=VALUES(disabled);
  ELSEIF p_dictionary = 'step' THEN
    INSERT INTO step (id, nr, name) VALUES (p_id, p_nr, p_name)
    ON DUPLICATE KEY UPDATE nr=VALUES(nr), name=VALUES(name);
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported dictionary';
  END IF;
END//
DELIMITER ;


-- ta_In.sql
DROP PROCEDURE IF EXISTS ta_In;
DELIMITER //
CREATE PROCEDURE ta_In(IN p_devid VARCHAR(64), IN p_tag VARCHAR(64))
BEGIN
  DECLARE v_idworker INT;
  SELECT idworker INTO v_idworker FROM tag_worker WHERE tag = UPPER(SUBSTRING(p_tag, 1, 8)) LIMIT 1;

  IF v_idworker IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown worker tag';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ta_event WHERE idworker = v_idworker AND duration IS NULL) THEN
    INSERT INTO ta_event (idworker, dt, duration) VALUES (v_idworker, NOW(), NULL);
  END IF;

  SELECT v_idworker AS idworker, NOW() AS dt;
END//
DELIMITER ;


-- ta_Out.sql
DROP PROCEDURE IF EXISTS ta_Out;
DELIMITER //
CREATE PROCEDURE ta_Out(IN p_devid VARCHAR(64), IN p_tag VARCHAR(64))
BEGIN
  DECLARE v_idworker INT;
  DECLARE v_dt DATETIME;
  SELECT idworker INTO v_idworker FROM tag_worker WHERE tag = UPPER(SUBSTRING(p_tag, 1, 8)) LIMIT 1;

  IF v_idworker IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown worker tag';
  END IF;

  SELECT dt INTO v_dt
    FROM ta_event
   WHERE idworker = v_idworker
     AND duration IS NULL
   ORDER BY dt DESC
   LIMIT 1;

  IF v_dt IS NOT NULL THEN
    UPDATE ta_event
       SET duration = TIMESTAMPDIFF(SECOND, v_dt, NOW())
     WHERE idworker = v_idworker
       AND dt = v_dt;
  END IF;

  SELECT v_idworker AS idworker, v_dt AS dt, SEC_TO_TIME(TIMESTAMPDIFF(SECOND, v_dt, NOW())) AS duration;
END//
DELIMITER ;


-- ta_event_delete.sql
DROP PROCEDURE IF EXISTS ta_event_delete;
DELIMITER //
CREATE PROCEDURE ta_event_delete(IN p_idworker INT, IN p_dt VARCHAR(32))
BEGIN
  DELETE FROM ta_event
   WHERE idworker = p_idworker
     AND dt = STR_TO_DATE(p_dt, '%d.%m.%Y %H:%i:%s');
END//
DELIMITER ;


-- ta_event_insert.sql
DROP PROCEDURE IF EXISTS ta_event_insert;
DELIMITER //
CREATE PROCEDURE ta_event_insert(IN p_idworker INT, IN p_dt VARCHAR(32), IN p_duration VARCHAR(32))
BEGIN
  INSERT INTO ta_event (idworker, dt, duration)
  VALUES (p_idworker, STR_TO_DATE(p_dt, '%d.%m.%Y %H:%i:%s'), TIME_TO_SEC(p_duration));

  SELECT idworker,
         DATE_FORMAT(dt, '%d.%m.%Y %H:%i:%s') AS dt,
         SEC_TO_TIME(duration) AS duration
    FROM ta_v_event
   WHERE idworker = p_idworker
     AND dt = STR_TO_DATE(p_dt, '%d.%m.%Y %H:%i:%s');
END//
DELIMITER ;


-- ta_event_periods.sql
DROP PROCEDURE IF EXISTS ta_event_periods;
DELIMITER //
CREATE PROCEDURE ta_event_periods()
BEGIN
  SELECT DISTINCT DATE_FORMAT(dt, '%Y%m') AS period,
         DATE_FORMAT(dt, '%m.%Y') AS fullname
    FROM ta_v_event
   ORDER BY 1;
END//
DELIMITER ;


-- ta_event_tree_days.sql
DROP PROCEDURE IF EXISTS ta_event_tree_days;
DELIMITER //
CREATE PROCEDURE ta_event_tree_days(IN p_period VARCHAR(6), IN p_idworker INT)
BEGIN
  SELECT CONCAT('d', DATE_FORMAT(dt, '%Y%m%d')) AS `key`,
         DATE_FORMAT(dt, '%d.%m.%Y') AS title,
         SEC_TO_TIME(SUM(IFNULL(duration, 0))) AS name,
         TRUE AS folder,
         TRUE AS lazy,
         COUNT(*) AS count,
         idworker,
         DATE_FORMAT(dt, '%d.%m.%Y') AS day_label,
         DATE_FORMAT(dt, '%Y-%m-%d') AS day_iso,
         'day' AS node_type
    FROM ta_v_event
   WHERE CAST(DATE_FORMAT(dt, '%Y%m') AS UNSIGNED) = CAST(p_period AS UNSIGNED)
     AND idworker = p_idworker
   GROUP BY DATE_FORMAT(dt, '%Y%m%d'), idworker
   ORDER BY 1;
END//
DELIMITER ;


-- ta_event_tree_events.sql
DROP PROCEDURE IF EXISTS ta_event_tree_events;
DELIMITER //
CREATE PROCEDURE ta_event_tree_events(IN p_period VARCHAR(6), IN p_idworker INT, IN p_day VARCHAR(8))
BEGIN
  SELECT CONCAT('e', DATE_FORMAT(dt, '%Y%m%d%H%i%s')) AS `key`,
         DATE_FORMAT(dt, '%H:%i:%s') AS title,
         SEC_TO_TIME(IFNULL(duration, 0)) AS name,
         FALSE AS folder,
         FALSE AS lazy,
         idworker,
         DATE_FORMAT(dt, '%d.%m.%Y %H:%i:%s') AS dt,
         SEC_TO_TIME(IFNULL(duration, 0)) AS duration,
         'event' AS node_type
    FROM ta_v_event
   WHERE CAST(DATE_FORMAT(dt, '%Y%m') AS UNSIGNED) = CAST(p_period AS UNSIGNED)
     AND idworker = p_idworker
     AND CAST(DATE_FORMAT(dt, '%Y%m%d') AS UNSIGNED) = CAST(p_day AS UNSIGNED)
   ORDER BY dt;
END//
DELIMITER ;


-- ta_event_tree_workers.sql
DROP PROCEDURE IF EXISTS ta_event_tree_workers;
DELIMITER //
CREATE PROCEDURE ta_event_tree_workers(IN p_period VARCHAR(6), IN p_filter_worker INT)
BEGIN
  SELECT CONCAT('w', w.id) AS `key`,
         CONCAT(w.nr, ' - ', w.name) AS title,
         SEC_TO_TIME(SUM(IFNULL(e.duration, 0))) AS name,
         TRUE AS folder,
         TRUE AS lazy,
         COUNT(*) AS count,
         w.id AS idworker,
         w.nr AS nr,
         w.name AS worker_name,
         'worker' AS node_type
    FROM worker w
   INNER JOIN ta_v_event e ON e.idworker = w.id
   WHERE CAST(DATE_FORMAT(e.dt, '%Y%m') AS UNSIGNED) = CAST(p_period AS UNSIGNED)
     AND (p_filter_worker <= 0 OR w.id = p_filter_worker)
   GROUP BY w.id, w.nr, w.name
   ORDER BY 0 + w.nr, w.name;
END//
DELIMITER ;


-- ta_event_update.sql
DROP PROCEDURE IF EXISTS ta_event_update;
DELIMITER //
CREATE PROCEDURE ta_event_update(IN p_idworker INT, IN p_old_dt VARCHAR(32), IN p_dt VARCHAR(32), IN p_duration VARCHAR(32))
BEGIN
  UPDATE ta_event
     SET dt = STR_TO_DATE(p_dt, '%d.%m.%Y %H:%i:%s'),
         duration = TIME_TO_SEC(p_duration)
   WHERE idworker = p_idworker
     AND dt = STR_TO_DATE(p_old_dt, '%d.%m.%Y %H:%i:%s');
END//
DELIMITER ;


-- ta_event_worker_events.sql
DROP PROCEDURE IF EXISTS ta_event_worker_events;
DELIMITER //
CREATE PROCEDURE ta_event_worker_events(IN p_period VARCHAR(6), IN p_idworker INT)
BEGIN
  SELECT CONCAT('e', DATE_FORMAT(dt, '%Y%m%d%H%i%s')) AS `key`,
         DATE_FORMAT(dt, '%d.%m.%Y %H:%i:%s') AS title,
         SEC_TO_TIME(duration) AS name,
         FALSE AS folder,
         FALSE AS lazy,
         idworker,
         DATE_FORMAT(dt, '%d.%m.%Y %H:%i:%s') AS dt,
         SEC_TO_TIME(duration) AS duration
    FROM ta_v_event
   WHERE idworker = p_idworker
     AND CAST(DATE_FORMAT(dt, '%Y%m') AS UNSIGNED) = CAST(p_period AS UNSIGNED)
   ORDER BY dt;
END//
DELIMITER ;


-- ta_event_workers.sql
DROP PROCEDURE IF EXISTS ta_event_workers;
DELIMITER //
CREATE PROCEDURE ta_event_workers()
BEGIN
  SELECT DISTINCT w.id AS id, w.nr, w.name
    FROM worker w
   INNER JOIN ta_v_event e ON e.idworker = w.id
   ORDER BY 2;
END//
DELIMITER ;


-- ta_event_xls.sql
DROP PROCEDURE IF EXISTS ta_event_xls;
DELIMITER //
CREATE PROCEDURE ta_event_xls(IN p_period VARCHAR(6))
BEGIN
  SELECT e.idworker,
         e.day,
         w.nr,
         w.name,
         DATE_FORMAT(e.dtmin, '%H:%i') AS t_min,
         DATE_FORMAT(e.dtmax, '%H:%i') AS t_max,
         TIME_FORMAT(SEC_TO_TIME(e.duration), '%H:%i') AS t_work,
         TIME_FORMAT(TIMEDIFF(e.dtmax, DATE_ADD(e.dtmin, INTERVAL IFNULL(e.duration,0) SECOND)), '%H:%i') AS t_rest,
         TIME_FORMAT(TIMEDIFF(e.dtmax, e.dtmin), '%H:%i') AS tduration_total
    FROM (
      SELECT idworker,
             DATE_FORMAT(dt, '%Y%m%d'),
             MAX(DATE_FORMAT(dt, '%d')) AS day,
             MAX(DATE_ADD(dt, INTERVAL IFNULL(duration,0) SECOND)) AS dtmax,
             MIN(dt) AS dtmin,
             SUM(IFNULL(duration,0)) AS duration
        FROM ta_v_event
       WHERE DATE_FORMAT(dt, '%Y%m') = p_period
       GROUP BY 1, 2
    ) e
   INNER JOIN worker w ON w.id = e.idworker
   ORDER BY 0 + w.nr, e.day;
END//
DELIMITER ;


-- tt_active_tasks_list.sql
DROP PROCEDURE IF EXISTS tt_active_tasks_list;

DELIMITER //

CREATE PROCEDURE tt_active_tasks_list()
BEGIN
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_current_event;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_order_stats;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_hu_stats;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_hu_finished_steps;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_active_orders;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_active_hu;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_finished_hu;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_finished_events;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_process_last_step;

  CREATE TEMPORARY TABLE tmp_tt_process_last_step AS
    SELECT p.idstep_grp,
           p.idstep AS idlast_step,
           x.total_steps
      FROM process p
      JOIN (
        SELECT idstep_grp,
               MAX(n) AS max_n,
               COUNT(*) AS total_steps
          FROM process
         WHERE idstep_grp > 0
         GROUP BY idstep_grp
      ) x ON x.idstep_grp = p.idstep_grp AND x.max_n = p.n;

  ALTER TABLE tmp_tt_process_last_step
    ADD INDEX idx_tmp_tt_pls_grp (idstep_grp),
    ADD INDEX idx_tmp_tt_pls_grp_step (idstep_grp, idlast_step);

  CREATE TEMPORARY TABLE tmp_tt_finished_events AS
    SELECT hu, idstep
      FROM tt_event
     WHERE hu > 0
       AND dtend IS NOT NULL
    UNION ALL
    SELECT hu, idstep
      FROM tt_event_archive
     WHERE hu > 0;

  ALTER TABLE tmp_tt_finished_events
    ADD INDEX idx_tmp_tt_finished_events_hu (hu),
    ADD INDEX idx_tmp_tt_finished_events_hu_step (hu, idstep);

  CREATE TEMPORARY TABLE tmp_tt_finished_hu AS
    SELECT DISTINCT h.hu
      FROM hu h
      JOIN tmp_tt_process_last_step pls ON pls.idstep_grp = h.idstep_grp
      JOIN tmp_tt_finished_events e ON e.hu = h.hu AND e.idstep = pls.idlast_step;

  ALTER TABLE tmp_tt_finished_hu
    ADD INDEX idx_tmp_tt_finished_hu (hu);

  CREATE TEMPORARY TABLE tmp_tt_active_hu AS
    SELECT h.hu,
           h.idorder,
           h.qty,
           h.idstep_grp
      FROM hu h
      LEFT JOIN tmp_tt_finished_hu fh ON fh.hu = h.hu
     WHERE fh.hu IS NULL;

  ALTER TABLE tmp_tt_active_hu
    ADD INDEX idx_tmp_tt_active_hu_hu (hu),
    ADD INDEX idx_tmp_tt_active_hu_order (idorder),
    ADD INDEX idx_tmp_tt_active_hu_step_grp (idstep_grp),
    ADD INDEX idx_tmp_tt_active_hu_order_hu (idorder, hu);

  CREATE TEMPORARY TABLE tmp_tt_active_orders AS
    SELECT DISTINCT idorder FROM tmp_tt_active_hu;

  ALTER TABLE tmp_tt_active_orders
    ADD INDEX idx_tmp_tt_active_orders_order (idorder);

  CREATE TEMPORARY TABLE tmp_tt_hu_finished_steps AS
    SELECT e.hu,
           COUNT(DISTINCT e.idstep) AS finished_steps
      FROM tmp_tt_finished_events e
      JOIN tmp_tt_active_hu h ON h.hu = e.hu
     GROUP BY e.hu;

  ALTER TABLE tmp_tt_hu_finished_steps
    ADD INDEX idx_tmp_tt_hu_finished_steps_hu (hu);

  CREATE TEMPORARY TABLE tmp_tt_hu_stats AS
    SELECT h.hu,
           h.idorder,
           h.qty,
           h.idstep_grp,
           sg.name AS step_grp,
           FLOOR(COALESCE(hfs.finished_steps, 0) * 100 / pls.total_steps) AS hu_complete
      FROM tmp_tt_active_hu h
      JOIN step_grp sg ON sg.id = h.idstep_grp
      JOIN tmp_tt_process_last_step pls ON pls.idstep_grp = h.idstep_grp
      LEFT JOIN tmp_tt_hu_finished_steps hfs ON hfs.hu = h.hu;

  ALTER TABLE tmp_tt_hu_stats
    ADD INDEX idx_tmp_tt_hu_stats_hu (hu),
    ADD INDEX idx_tmp_tt_hu_stats_order (idorder),
    ADD INDEX idx_tmp_tt_hu_stats_order_hu (idorder, hu);

  CREATE TEMPORARY TABLE tmp_tt_order_stats AS
    SELECT idorder,
           FLOOR(AVG(hu_complete)) AS order_complete
      FROM tmp_tt_hu_stats
     GROUP BY idorder;

  ALTER TABLE tmp_tt_order_stats
    ADD INDEX idx_tmp_tt_order_stats_order (idorder),
    ADD INDEX idx_tmp_tt_order_stats_complete (order_complete);

  CREATE TEMPORARY TABLE tmp_tt_current_event AS
    SELECT e.hu, e.idstep, e.idworker, e.idplace, e.dt
      FROM tt_event e
      JOIN tmp_tt_active_hu h ON h.hu = e.hu
     WHERE e.dtend IS NULL;

  ALTER TABLE tmp_tt_current_event
    ADD INDEX idx_tmp_tt_current_event_hu (hu),
    ADD INDEX idx_tmp_tt_current_event_hu_dt (hu, dt);

  SELECT CONCAT(o.name, ' (', DATE_FORMAT(o.d, '%d-%m-%Y'), IFNULL(CONCAT(' Delivery ', DATE_FORMAT(o.dtarget, '%d-%m-%Y')), ''), ')') AS `order`,
         CONCAT(pg.nr, '-', ps.nr, '-', p.nr, ' ', p.name, ' - ', o.qty, ' pcs') AS product,
         CONCAT(hs.hu, ': ', hs.step_grp, ' - ', hs.qty, ' pcs') AS hu,
         os.order_complete,
         hs.hu_complete,
         IFNULL(CONCAT('[', w.nr, '] ', w.name), '') AS worker,
         IFNULL(CONCAT('[', s.nr, '] ', s.name), '') AS step,
         IFNULL(CONCAT('[', l.id, '] ', l.name), '') AS place
    FROM tmp_tt_order_stats os
    JOIN tmp_tt_active_orders ao ON ao.idorder = os.idorder
    JOIN `order` o ON o.id = os.idorder
    JOIN tmp_tt_hu_stats hs ON hs.idorder = os.idorder
    JOIN product p ON p.id = o.idproduct
    JOIN product_sgrp ps ON ps.id = p.idproduct_sgrp
    JOIN product_grp pg ON pg.id = ps.idproduct_grp
    LEFT JOIN tmp_tt_current_event ce ON ce.hu = hs.hu
    LEFT JOIN step s ON s.id = ce.idstep
    LEFT JOIN worker w ON w.id = ce.idworker
    LEFT JOIN tt_place l ON l.id = ce.idplace
   WHERE os.order_complete < 100
   ORDER BY os.idorder, hs.hu, ce.dt;

  DROP TEMPORARY TABLE IF EXISTS tmp_tt_current_event;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_order_stats;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_hu_stats;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_hu_finished_steps;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_active_orders;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_active_hu;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_finished_hu;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_finished_events;
  DROP TEMPORARY TABLE IF EXISTS tmp_tt_process_last_step;
END//

DELIMITER ;


-- tt_heartbeat.sql
DROP PROCEDURE IF EXISTS tt_heartbeat;
DELIMITER //
CREATE PROCEDURE tt_heartbeat(IN p_devid INT)
BEGIN
  UPDATE tt_place
     SET dtlast = NOW()
   WHERE id = p_devid;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'The device does not exist.';
  END IF;
END//
DELIMITER ;


-- tt_heartbeatChanged.sql
DROP PROCEDURE IF EXISTS tt_heartbeatChanged;
DELIMITER //
CREATE PROCEDURE tt_heartbeatChanged(IN p_devid INT, IN p_tags VARCHAR(255))
BEGIN
  DECLARE v_continuousTime INT DEFAULT 60;
  DECLARE v_newIdStep INT DEFAULT NULL;
  DECLARE v_hu INT DEFAULT NULL;
  DECLARE v_idstep INT;
  DECLARE v_huTag VARCHAR(8);
  DECLARE v_workplace VARCHAR(255);
  DECLARE v_workstep NVARCHAR(255);
  DECLARE v_previousTags VARCHAR(255);

  SELECT tags, idstep, name
    INTO v_previousTags, v_idstep, v_workplace
    FROM tt_place
   WHERE id = p_devid;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'The device does not exist.';
  END IF;

  UPDATE tt_event
     SET isArchived = 1
   WHERE isArchived = 0
     AND dtend < DATE_SUB(NOW(), INTERVAL v_continuousTime SECOND);

  SELECT hu, tag
    INTO v_hu, v_huTag
    FROM tag_hu
   WHERE FIND_IN_SET(tag, p_tags)
   ORDER BY hu
   LIMIT 1;

  DROP TEMPORARY TABLE IF EXISTS _tblWorkers;

  CREATE TEMPORARY TABLE _tblWorkers
       ( SELECT t.idworker, t.tag, w.name, 0 AS isActive
           FROM tag_worker t
          INNER JOIN worker w ON w.id = t.idworker
          WHERE FIND_IN_SET(t.tag, p_tags)
       );

  IF (p_tags <> v_previousTags) THEN
    SELECT idstep
      INTO v_newIdStep
      FROM tag_step
     WHERE FIND_IN_SET(tag, p_tags)
     ORDER BY idstep
     LIMIT 1;

    IF v_newIdStep IS NOT NULL THEN
      SET v_idstep = v_newIdStep;
    END IF;

    UPDATE tt_event
       SET dtend = NOW()
     WHERE isArchived = 0
       AND dtend IS NULL
       AND idplace = p_devid
       AND (idstep <> v_idstep OR v_hu IS NULL OR hu <> v_hu OR idworker NOT IN (SELECT idworker FROM _tblWorkers));

    UPDATE tt_event
       SET dtend = NOW()
     WHERE isArchived = 0
       AND dtend IS NULL
       AND (hu = v_hu OR idworker IN (SELECT idworker FROM _tblWorkers))
       AND idplace <> p_devid;

    UPDATE tt_event e
    INNER JOIN _tblWorkers w ON w.idworker = e.idworker
       SET e.dtend = NULL
     WHERE isArchived = 0
       AND e.idplace = p_devid
       AND e.idstep = v_idstep
       AND e.hu = v_hu
       AND e.dtend >= DATE_SUB(NOW(), INTERVAL v_continuousTime SECOND);

    UPDATE _tblWorkers w
    INNER JOIN tt_event e ON e.idworker = w.idworker
       SET w.isActive = 1
     WHERE e.isArchived = 0
       AND e.dtend IS NULL
       AND e.idplace = p_devid
       AND e.idstep = v_idstep
       AND e.hu = v_hu;

    INSERT INTO tt_event (dt, idplace, idstep, idworker, hu)
    SELECT NOW(), p_devid, v_idstep, idworker, v_hu
      FROM _tblWorkers
     WHERE v_hu IS NOT NULL
       AND isActive = 0;
  END IF;

  UPDATE tt_place
     SET dtlast = NOW(),
         tags = p_tags,
         idstep = v_idstep
   WHERE id = p_devid;

  SELECT name
    INTO v_workstep
    FROM step
   WHERE id = v_idstep
   ORDER BY name
   LIMIT 1;

  SELECT v_workplace AS workplace, v_workstep AS workstep;

  SELECT v_huTag AS uid, v_hu AS n
   WHERE v_hu IS NOT NULL;

  SELECT tag AS uid, name
    FROM _tblWorkers
   ORDER BY name;

  DROP TEMPORARY TABLE IF EXISTS _tblWorkers;
END//
DELIMITER ;


-- tt_hu_create_order.sql
DROP PROCEDURE IF EXISTS tt_hu_create_order;
DELIMITER //
CREATE PROCEDURE tt_hu_create_order(
  IN p_order VARCHAR(255),
  IN p_order2 VARCHAR(255),
  IN p_idproduct INT,
  IN p_idproduct_grp INT,
  IN p_qty DECIMAL(18,6),
  IN p_qty_on_list DECIMAL(18,6)
)
BEGIN
  DECLARE v_idorder INT;
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_idstep_grp INT;
  DECLARE v_plan_qty DECIMAL(18,6);
  DECLARE v_total DECIMAL(18,6);
  DECLARE v_full_count INT;
  DECLARE v_remainder DECIMAL(18,6);
  DECLARE v_i INT;
  DECLARE cur CURSOR FOR SELECT idstep_grp, qty FROM plan WHERE idproduct_grp = p_idproduct_grp ORDER BY idstep_grp;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  IF p_qty_on_list IS NULL OR p_qty_on_list <= 0 OR p_qty_on_list > p_qty THEN
    SET p_qty_on_list = p_qty;
  END IF;

  START TRANSACTION;
  INSERT INTO `order` (name, name2, idproduct, qty) VALUES (p_order, p_order2, p_idproduct, p_qty);
  SET v_idorder = LAST_INSERT_ID();

  OPEN cur;
  plan_loop: LOOP
    FETCH cur INTO v_idstep_grp, v_plan_qty;
    IF v_done THEN
      LEAVE plan_loop;
    END IF;

    SET v_total = p_qty * v_plan_qty;
    SET v_full_count = FLOOR(v_total / p_qty_on_list);
    SET v_remainder = v_total - (v_full_count * p_qty_on_list);
    SET v_i = 0;

    WHILE v_i < v_full_count DO
      INSERT INTO hu (idorder, idstep_grp, qty) VALUES (v_idorder, v_idstep_grp, p_qty_on_list);
      SET v_i = v_i + 1;
    END WHILE;

    IF v_remainder > 0.000001 THEN
      INSERT INTO hu (idorder, idstep_grp, qty) VALUES (v_idorder, v_idstep_grp, v_remainder);
    END IF;
  END LOOP;
  CLOSE cur;
  COMMIT;

  SELECT 'Ok' AS Result, v_idorder AS idorder;
END//
DELIMITER ;


-- tt_hu_delete_order.sql
DROP PROCEDURE IF EXISTS tt_hu_delete_order;
DELIMITER //
CREATE PROCEDURE tt_hu_delete_order(IN p_idorder INT)
BEGIN
  DELETE FROM `order` WHERE id = p_idorder;
END//
DELIMITER ;


-- tt_hu_info.sql
DROP PROCEDURE IF EXISTS tt_hu_info;
DELIMITER //
CREATE PROCEDURE tt_hu_info(IN p_idorder INT, IN p_hu INT)
BEGIN
  DECLARE v_idorder INT;

  SET v_idorder = p_idorder;
  IF v_idorder IS NULL AND p_hu IS NOT NULL THEN
    SELECT idorder INTO v_idorder FROM hu WHERE hu = p_hu LIMIT 1;
  END IF;

  SELECT DISTINCT o.name AS o_name, o.name2 AS o_name2, o.qty AS o_qty,
         CONCAT(pg.nr, '-', ps.nr, '-', pr.nr) AS p_nr,
         CONCAT(pg.name, ' ', ps.name, ' ', pr.name) AS p_name
    FROM `order` o
    JOIN product pr ON pr.id = o.idproduct
    JOIN product_sgrp ps ON ps.id = pr.idproduct_sgrp
    JOIN product_grp pg ON pg.id = ps.idproduct_grp
   WHERE o.id = v_idorder;

  SELECT h.hu, h.qty AS hu_qty, sg.nr AS hu_s_nr, sg.name AS hu_s_name
    FROM hu h
    JOIN step_grp sg ON sg.id = h.idstep_grp
   WHERE h.idorder = v_idorder
     AND (p_hu IS NULL OR h.hu = p_hu)
   ORDER BY h.hu;

  SELECT DISTINCT h.hu, pc.n AS step_n, CONCAT(pc.n, '_', pc.idstep) AS step_id,
         st.name AS step_name, DATE_FORMAT(e.dt,'%d-%m-%Y %H:%i:%s') AS event_dt,
         IFNULL(TIME_FORMAT(SEC_TO_TIME(TIMESTAMPDIFF(SECOND,e.dt,IFNULL(e.dtend,e.dt))),'%H:%i:%s'),'') AS event_duration,
         IFNULL(CONCAT(w.nr, ' - ', w.name), '') AS event_worker
    FROM `order` o
   INNER JOIN hu h ON h.idorder = o.id
   INNER JOIN product pr ON pr.id = o.idproduct
   INNER JOIN product_sgrp ps ON ps.id = pr.idproduct_sgrp
   INNER JOIN plan pl ON pl.idproduct_grp = ps.idproduct_grp AND pl.idstep_grp = h.idstep_grp
   INNER JOIN process pc ON pc.idstep_grp = pl.idstep_grp
   INNER JOIN step st ON st.id = pc.idstep
    LEFT OUTER JOIN (
      SELECT hu, idstep, idworker, dt, dtend FROM tt_event
      UNION ALL
      SELECT hu, idstep, idworker, dt, dtend FROM tt_event_archive
    ) e ON e.hu = h.hu AND e.idstep = pc.idstep
    LEFT OUTER JOIN worker w ON w.id = e.idworker
   WHERE o.id = v_idorder
     AND (p_hu IS NULL OR h.hu = p_hu)
  UNION ALL
  SELECT h.hu, 0 AS step_n, CONCAT('_', pc.idstep) AS step_id,
         CONCAT('*', st.name) AS step_name, DATE_FORMAT(e.dt,'%d-%m-%Y %H:%i:%s') AS event_dt,
         IFNULL(TIME_FORMAT(SEC_TO_TIME(TIMESTAMPDIFF(SECOND,e.dt,IFNULL(e.dtend,e.dt))),'%H:%i:%s'),'') AS event_duration,
         IFNULL(CONCAT(w.nr, ' - ', w.name), '') AS event_worker
    FROM `order` o
   INNER JOIN hu h ON h.idorder = o.id
   INNER JOIN product pr ON pr.id = o.idproduct
   INNER JOIN product_sgrp ps ON ps.id = pr.idproduct_sgrp
   INNER JOIN (
      SELECT hu, idstep, idworker, dt, dtend FROM tt_event
      UNION ALL
      SELECT hu, idstep, idworker, dt, dtend FROM tt_event_archive
   ) e ON e.hu = h.hu
   INNER JOIN step st ON st.id = e.idstep
   INNER JOIN worker w ON w.id = e.idworker
    LEFT OUTER JOIN plan pl ON pl.idproduct_grp = ps.idproduct_grp AND pl.idstep_grp = h.idstep_grp
    LEFT OUTER JOIN process pc ON pc.idstep_grp = pl.idstep_grp AND pc.idstep = e.idstep
   WHERE o.id = v_idorder
     AND (p_hu IS NULL OR h.hu = p_hu)
     AND pc.idstep IS NULL
   ORDER BY 1, 2;
END//
DELIMITER ;


-- tt_hu_list_days.sql
DROP PROCEDURE IF EXISTS tt_hu_list_days;
DELIMITER //
CREATE PROCEDURE tt_hu_list_days(IN p_ym VARCHAR(6))
BEGIN
  SELECT DATE_FORMAT(d,'%Y%m%d') AS `key`,
         DATE_FORMAT(d,'%d.%m.%Y') AS title,
         TRUE AS folder,
         TRUE AS lazy,
         COUNT(*) AS count
    FROM `order`
   WHERE DATE_FORMAT(d, '%Y%m') = p_ym AND idproduct > 0
   GROUP BY 1
   ORDER BY 1;
END//
DELIMITER ;


-- tt_hu_list_months.sql
DROP PROCEDURE IF EXISTS tt_hu_list_months;
DELIMITER //
CREATE PROCEDURE tt_hu_list_months(IN p_year VARCHAR(4))
BEGIN
  SELECT DATE_FORMAT(d,'%Y%m') AS `key`,
         DATE_FORMAT(d,'%M %Y') AS title,
         TRUE AS folder,
         TRUE AS lazy,
         COUNT(*) AS count
    FROM `order`
   WHERE DATE_FORMAT(d, '%Y') = p_year AND idproduct > 0
   GROUP BY 1
   ORDER BY 1;
END//
DELIMITER ;


-- tt_hu_list_years.sql
DROP PROCEDURE IF EXISTS tt_hu_list_years;
DELIMITER //
CREATE PROCEDURE tt_hu_list_years()
BEGIN
  SELECT DATE_FORMAT(d,'%Y') AS `key`,
         DATE_FORMAT(d,'%Y') AS title,
         TRUE AS folder,
         TRUE AS lazy,
         COUNT(*) AS count
    FROM `order`
   WHERE idproduct > 0
   GROUP BY 1
   ORDER BY 1;
END//
DELIMITER ;


-- tt_hu_orders.sql
DROP PROCEDURE IF EXISTS tt_hu_orders;
DELIMITER //
CREATE PROCEDURE tt_hu_orders(IN p_ymd VARCHAR(8))
BEGIN
  SELECT o.id AS `key`,
         CONCAT(o.name, ' (', pg.nr, '-', ps.nr, '-', pr.nr, ' - ', o.qty, ' pcs)') AS title,
         TRUE AS folder, TRUE AS lazy,
         COUNT(DISTINCT h.hu) AS count,
         IFNULL(TIME_FORMAT(SEC_TO_TIME(SUM(TIMESTAMPDIFF(SECOND, e.dt, IFNULL(e.dtend, e.dt)))), '%H:%i:%s'), '') AS duration,
         (EXISTS(
            SELECT 1 FROM plan pl JOIN process pc ON pc.idstep_grp = pl.idstep_grp
             WHERE pl.idproduct_grp = ps.idproduct_grp
               AND NOT EXISTS(SELECT 1 FROM tt_event ev WHERE ev.hu = h.hu AND ev.idstep = pc.idstep)
          )
          OR EXISTS(SELECT 1 FROM tt_event e2 WHERE e2.hu = h.hu AND e2.dtend IS NULL)) AS incomplete
    FROM `order` o
    JOIN hu h ON h.idorder = o.id
    JOIN product pr ON pr.id = o.idproduct
    JOIN product_sgrp ps ON ps.id = pr.idproduct_sgrp
    JOIN product_grp pg ON pg.id = ps.idproduct_grp
    LEFT JOIN tt_event e ON e.hu = h.hu
   WHERE o.ymd = p_ymd AND o.idproduct > 0
   GROUP BY o.id
   ORDER BY title;
END//
DELIMITER ;


-- tt_hu_proc_lists.sql
DROP PROCEDURE IF EXISTS tt_hu_proc_lists;
DELIMITER //
CREATE PROCEDURE tt_hu_proc_lists(IN p_idorder INT)
BEGIN
  WITH order_hu AS (
    SELECT h.hu, h.idorder, h.qty, h.idstep_grp
      FROM hu h
     WHERE h.idorder = p_idorder
  ),
  event_union AS (
    SELECT dt, dtend, hu, idstep FROM tt_event
    UNION ALL
    SELECT dt, dtend, hu, idstep FROM tt_event_archive
  ),
  hu_base AS (
    SELECT h.hu, h.idorder, h.qty, sg.nr AS sg_nr, sg.name AS sg_name,
           IFNULL(TIME_FORMAT(SEC_TO_TIME(SUM(TIMESTAMPDIFF(SECOND, e.dt, IFNULL(e.dtend, e.dt)))), '%H:%i:%s'), '') AS duration
      FROM order_hu h
      JOIN step_grp sg ON sg.id = h.idstep_grp
      LEFT JOIN event_union e ON e.hu = h.hu
     GROUP BY h.hu
  ),
  unfinished_hu AS (
    SELECT DISTINCT h.hu
      FROM order_hu h
      JOIN `order` o ON h.idorder = o.id
      JOIN product pr ON o.idproduct = pr.id
      JOIN product_sgrp ps ON pr.idproduct_sgrp = ps.id
      JOIN plan pl ON pl.idproduct_grp = ps.idproduct_grp
      JOIN process pc ON pc.idstep_grp = pl.idstep_grp
      LEFT JOIN event_union e ON e.hu = h.hu AND e.idstep = pc.idstep
     WHERE e.idstep IS NULL
  ),
  no_steps_hu AS (
    SELECT DISTINCT e.hu
      FROM order_hu h
      JOIN event_union e ON e.hu = h.hu
     WHERE e.dtend IS NULL
  )
  SELECT hb.hu AS `key`,
         CONCAT(hb.hu, ' (', hb.sg_nr, ' ', hb.sg_name, ' - ', hb.qty, ' pcs)') AS title,
         hb.duration,
         BIT_OR(CASE WHEN uf.hu IS NOT NULL OR ns.hu IS NOT NULL THEN 1 ELSE 0 END) AS incomplete
    FROM hu_base hb
    LEFT JOIN unfinished_hu uf ON uf.hu = hb.hu
    LEFT JOIN no_steps_hu ns ON ns.hu = hb.hu
   GROUP BY hb.hu
   ORDER BY title;
END//
DELIMITER ;


-- tt_map_connected.sql
DROP FUNCTION IF EXISTS tt_map_connected;

DELIMITER //

CREATE FUNCTION tt_map_connected(
  p_mapX DOUBLE,
  p_mapY DOUBLE
) RETURNS TINYINT(1)
DETERMINISTIC
NO SQL
BEGIN
  RETURN p_mapX IS NOT NULL AND p_mapY IS NOT NULL;
END//

DELIMITER ;


-- tt_map_delete_place.sql
DROP PROCEDURE IF EXISTS tt_map_delete_place;

DELIMITER //

CREATE PROCEDURE tt_map_delete_place(
  IN p_id INT
)
BEGIN
  DELETE
    FROM tt_place
   WHERE id > 0
     AND id = p_id;

  SELECT ROW_COUNT() AS affectedRows;
END//

DELIMITER ;


-- tt_map_disconnect_place.sql
DROP PROCEDURE IF EXISTS tt_map_disconnect_place;

DELIMITER //

CREATE PROCEDURE tt_map_disconnect_place(
  IN p_id INT
)
BEGIN
  UPDATE tt_place
     SET mapX = DEFAULT,
         mapY = DEFAULT
   WHERE id = p_id;
END//

DELIMITER ;


-- tt_map_list.sql
DROP PROCEDURE IF EXISTS tt_map_list;

DELIMITER //

CREATE PROCEDURE tt_map_list()
BEGIN
  SELECT p.id,
         p.name,
         p.mapX,
         p.mapY,
         p.dtlast < (NOW() - INTERVAL 1 MINUTE) AS issue,
         CONCAT(s.nr, ' - ', s.name) AS step,
         MAX(h.hu) AS hu,
         GROUP_CONCAT(w.nr, '-', w.name SEPARATOR '; ') AS workers
    FROM tt_place p
   INNER JOIN step s ON s.id = p.idstep
    LEFT OUTER JOIN tag_hu h ON FIND_IN_SET(h.tag, p.tags)
    LEFT OUTER JOIN tag_worker tw ON FIND_IN_SET(tw.tag, p.tags)
    LEFT OUTER JOIN worker w ON w.id = tw.idworker
   WHERE tt_map_connected(p.mapX, p.mapY)
   GROUP BY p.id;
END//

DELIMITER ;


-- tt_map_move_place.sql
DROP PROCEDURE IF EXISTS tt_map_move_place;

DELIMITER //

CREATE PROCEDURE tt_map_move_place(
  IN p_id INT,
  IN p_mapX DOUBLE,
  IN p_mapY DOUBLE
)
BEGIN
  UPDATE tt_place
     SET mapX = p_mapX,
         mapY = p_mapY
   WHERE id = p_id;
END//

DELIMITER ;


-- tt_map_set_team_alone.sql
DROP PROCEDURE IF EXISTS tt_map_set_team_alone;

DELIMITER //

CREATE PROCEDURE tt_map_set_team_alone(
  IN p_idplace INT
)
BEGIN
  REPLACE INTO tt_team
     SET idplace = p_idplace;
END//

DELIMITER ;


-- tt_map_set_team_source.sql
DROP PROCEDURE IF EXISTS tt_map_set_team_source;

DELIMITER //

CREATE PROCEDURE tt_map_set_team_source(
  IN p_idplace INT,
  IN p_idsource INT
)
BEGIN
  REPLACE INTO tt_team
     SET idplace = p_idplace,
         idsource = p_idsource;
END//

DELIMITER ;


-- tt_map_steps.sql
DROP PROCEDURE IF EXISTS tt_map_steps;

DELIMITER //

CREATE PROCEDURE tt_map_steps()
BEGIN
  SELECT id,
         nr,
         name
    FROM step
   WHERE id > 0
   ORDER BY nr;
END//

DELIMITER ;


-- tt_map_table.sql
DROP PROCEDURE IF EXISTS tt_map_table;

DELIMITER //

CREATE PROCEDURE tt_map_table(
  IN p_id VARCHAR(255),
  IN p_name VARCHAR(255),
  IN p_idstep INT,
  IN p_nrworkers VARCHAR(255),
  IN p_hu INT
)
BEGIN
  SELECT *
    FROM (
      SELECT p.id AS `key`,
             p.id AS `title`,
             p.id,
             p.name,
             p.idstep,
             FALSE AS folder,
             FALSE AS lazy,
             'place' AS node_type,
             tt_map_connected(p.mapX, p.mapY) AS connected,
             MAX(h.hu) AS hu,
             GROUP_CONCAT(w.nr SEPARATOR '; ') AS nrworkers
        FROM tt_place p
       INNER JOIN step s ON s.id = p.idstep
        LEFT OUTER JOIN tag_hu h ON FIND_IN_SET(h.tag, p.tags)
        LEFT OUTER JOIN tag_worker tw ON FIND_IN_SET(tw.tag, p.tags)
        LEFT OUTER JOIN worker w ON w.id = tw.idworker
       GROUP BY p.id
    ) res
   WHERE (p_id IS NULL OR CAST(res.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', CONVERT(p_id USING utf8mb4), '%') COLLATE utf8mb4_unicode_ci)
     AND (p_name IS NULL OR UPPER(CONVERT(res.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_name USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci)
     AND (p_idstep IS NULL OR res.idstep = p_idstep)
     AND (p_nrworkers IS NULL OR UPPER(CONVERT(res.nrworkers USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_nrworkers USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci)
     AND (p_hu IS NULL OR res.hu = p_hu)
   ORDER BY res.id;
END//

DELIMITER ;


-- tt_map_update_place.sql
DROP PROCEDURE IF EXISTS tt_map_update_place;

DELIMITER //

CREATE PROCEDURE tt_map_update_place(
  IN p_id INT,
  IN p_name VARCHAR(255),
  IN p_idstep INT
)
BEGIN
  UPDATE tt_place
     SET idstep = p_idstep,
         name = p_name
   WHERE id > 0
     AND id = p_id;

  SELECT *
    FROM tt_place
   WHERE id = p_id;
END//

DELIMITER ;


-- tt_plan_delete.sql
DROP PROCEDURE IF EXISTS tt_plan_delete;

DELIMITER //

CREATE PROCEDURE tt_plan_delete(
  IN p_idproduct_grp INT,
  IN p_idstep_grp INT
)
BEGIN
  DELETE FROM plan
   WHERE idproduct_grp = p_idproduct_grp
     AND idstep_grp = p_idstep_grp;
END//

DELIMITER ;


-- tt_plan_processes.sql
DROP PROCEDURE IF EXISTS tt_plan_processes;

DELIMITER //

CREATE PROCEDURE tt_plan_processes()
BEGIN
  SELECT * FROM step_grp WHERE id > 0 ORDER BY nr;
END//

DELIMITER ;


-- tt_plan_tree.sql
DROP PROCEDURE IF EXISTS tt_plan_tree;

DELIMITER //

CREATE PROCEDURE tt_plan_tree(
  IN p_idproduct_grp INT,
  IN p_filter VARCHAR(255)
)
BEGIN
  IF p_idproduct_grp IS NULL AND p_filter IS NOT NULL THEN
    SELECT CONCAT(pl.idproduct_grp, '/', pl.idstep_grp) AS `key`,
           pl.qty AS title,
           CONCAT_WS('/', pg.nr, pg.name, sg.nr, sg.name) AS displayName,
           FALSE AS folder,
           FALSE AS lazy
      FROM plan pl
     INNER JOIN product_grp pg ON pg.id = pl.idproduct_grp
     INNER JOIN step_grp sg ON sg.id = pl.idstep_grp
     WHERE UPPER(CONVERT(pg.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(pg.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(sg.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(sg.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR CAST(pl.qty AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', CONVERT(p_filter USING utf8mb4), '%') COLLATE utf8mb4_unicode_ci
     ORDER BY displayName, title;
  ELSEIF p_idproduct_grp IS NOT NULL THEN
    SELECT CONCAT(p_idproduct_grp, '/', sg.id) AS `key`,
           pl.qty AS title,
           CONCAT_WS('/', sg.nr, sg.name) AS displayName,
           sg.nr,
           sg.name,
           pl.qty
      FROM plan pl
     INNER JOIN step_grp sg ON sg.id = pl.idstep_grp
     WHERE pl.idproduct_grp = p_idproduct_grp
     ORDER BY sg.nr;
  ELSE
    SELECT id AS `key`,
           nr AS title,
           CONCAT(nr, ' ', name) AS displayName,
           id,
           nr,
           name,
           TRUE AS folder,
           TRUE AS lazy,
           (SELECT COUNT(*) FROM plan pl WHERE pl.idproduct_grp = product_grp.id) AS count
      FROM product_grp
     WHERE id > 0
     ORDER BY nr;
  END IF;
END//

DELIMITER ;


-- tt_plan_update.sql
DROP PROCEDURE IF EXISTS tt_plan_update;

DELIMITER //

CREATE PROCEDURE tt_plan_update(
  IN p_idproduct_grp INT,
  IN p_idstep_grp INT,
  IN p_qty DECIMAL(18,6)
)
BEGIN
  UPDATE plan
     SET qty = p_qty
   WHERE idproduct_grp = p_idproduct_grp
     AND idstep_grp = p_idstep_grp;
END//

DELIMITER ;


-- tt_plan_upsert.sql
DROP PROCEDURE IF EXISTS tt_plan_upsert;

DELIMITER //

CREATE PROCEDURE tt_plan_upsert(
  IN p_idproduct_grp INT,
  IN p_idstep_grp INT,
  IN p_qty DECIMAL(18,6)
)
BEGIN
  INSERT INTO plan (idproduct_grp, idstep_grp, qty)
  VALUES (p_idproduct_grp, p_idstep_grp, p_qty)
  ON DUPLICATE KEY UPDATE qty = VALUES(qty);
END//

DELIMITER ;


-- tt_process_delete.sql
DROP PROCEDURE IF EXISTS tt_process_delete;

DELIMITER //

CREATE PROCEDURE tt_process_delete(
  IN p_idstep_grp INT,
  IN p_idstep INT
)
BEGIN
  IF p_idstep IS NULL THEN
    DELETE FROM step_grp WHERE id = p_idstep_grp;
  ELSE
    DELETE FROM process
     WHERE idstep_grp = p_idstep_grp
       AND idstep = p_idstep;
  END IF;
END//

DELIMITER ;


-- tt_process_insert_group.sql
DROP PROCEDURE IF EXISTS tt_process_insert_group;

DELIMITER //

CREATE PROCEDURE tt_process_insert_group(
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255)
)
BEGIN
  INSERT INTO step_grp (nr, name) VALUES (p_nr, p_name);
END//

DELIMITER ;


-- tt_process_steps.sql
DROP PROCEDURE IF EXISTS tt_process_steps;

DELIMITER //

CREATE PROCEDURE tt_process_steps()
BEGIN
  SELECT * FROM step WHERE id > 0 ORDER BY nr;
END//

DELIMITER ;


-- tt_process_tree.sql
DROP PROCEDURE IF EXISTS tt_process_tree;

DELIMITER //

CREATE PROCEDURE tt_process_tree(
  IN p_idgrp INT,
  IN p_filter VARCHAR(255)
)
BEGIN
  IF p_idgrp IS NULL AND p_filter IS NOT NULL THEN
    SELECT CONCAT(r.idstep_grp, '/', r.idstep) AS `key`,
           r.n AS title,
           CONCAT_WS('/', g.nr, s.nr, s.name) AS displayName,
           FALSE AS folder,
           FALSE AS lazy
      FROM process r
     INNER JOIN step s ON s.id = r.idstep
     INNER JOIN step_grp g ON g.id = r.idstep_grp
     WHERE UPPER(CONVERT(g.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(g.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(s.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(s.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR CAST(r.n AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', CONVERT(p_filter USING utf8mb4), '%') COLLATE utf8mb4_unicode_ci
     ORDER BY displayName, title;
  ELSEIF p_idgrp IS NOT NULL THEN
    SELECT CONCAT(p_idgrp, '/', r.idstep) AS `key`,
           r.n AS title,
           CONCAT_WS('/', s.nr, s.name) AS displayName,
           s.nr,
           s.name,
           r.n
      FROM process r
     INNER JOIN step s ON s.id = r.idstep
     WHERE r.idstep_grp = p_idgrp
     ORDER BY r.n;
  ELSE
    SELECT id AS `key`,
           nr AS title,
           CONCAT(nr, ' ', name) AS displayName,
           id,
           nr,
           name,
           TRUE AS folder,
           TRUE AS lazy,
           (SELECT COUNT(*) FROM process r WHERE r.idstep_grp = step_grp.id) AS count
      FROM step_grp
     WHERE id > 0
     ORDER BY nr;
  END IF;
END//

DELIMITER ;


-- tt_process_update.sql
DROP PROCEDURE IF EXISTS tt_process_update;

DELIMITER //

CREATE PROCEDURE tt_process_update(
  IN p_idstep_grp INT,
  IN p_idstep INT,
  IN p_n INT
)
BEGIN
  UPDATE process
     SET n = p_n
   WHERE idstep_grp = p_idstep_grp
     AND idstep = p_idstep;
END//

DELIMITER ;


-- tt_process_update_group.sql
DROP PROCEDURE IF EXISTS tt_process_update_group;

DELIMITER //

CREATE PROCEDURE tt_process_update_group(
  IN p_id INT,
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255)
)
BEGIN
  UPDATE step_grp
     SET nr = p_nr,
         name = p_name
   WHERE id > 0
     AND id = p_id;
END//

DELIMITER ;


-- tt_process_upsert.sql
DROP PROCEDURE IF EXISTS tt_process_upsert;

DELIMITER //

CREATE PROCEDURE tt_process_upsert(
  IN p_idstep_grp INT,
  IN p_idstep INT,
  IN p_n INT
)
BEGIN
  INSERT INTO process (idstep_grp, idstep, n)
  VALUES (p_idstep_grp, p_idstep, p_n)
  ON DUPLICATE KEY UPDATE n = VALUES(n);
END//

DELIMITER ;


-- tt_product_delete.sql
DROP PROCEDURE IF EXISTS tt_product_delete;

DELIMITER //

CREATE PROCEDURE tt_product_delete(
  IN p_idgrp INT,
  IN p_idsgrp INT,
  IN p_id INT
)
BEGIN
  IF p_id IS NOT NULL THEN
    DELETE FROM product WHERE id = p_id;
  ELSEIF p_idsgrp IS NOT NULL THEN
    DELETE FROM product_sgrp WHERE id = p_idsgrp;
  ELSE
    DELETE FROM product_grp WHERE id = p_idgrp;
  END IF;
END//

DELIMITER ;


-- tt_product_insert.sql
DROP PROCEDURE IF EXISTS tt_product_insert;

DELIMITER //

CREATE PROCEDURE tt_product_insert(
  IN p_idgrp INT,
  IN p_idsgrp INT,
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255)
)
BEGIN
  IF p_idsgrp IS NOT NULL THEN
    INSERT INTO product (idproduct_sgrp, nr, name)
    VALUES (p_idsgrp, p_nr, p_name);
  ELSEIF p_idgrp IS NOT NULL THEN
    INSERT INTO product_sgrp (idproduct_grp, nr, name)
    VALUES (p_idgrp, p_nr, p_name);
  ELSE
    INSERT INTO product_grp (nr, name)
    VALUES (p_nr, p_name);
  END IF;
END//

DELIMITER ;


-- tt_product_tree.sql
DROP PROCEDURE IF EXISTS tt_product_tree;

DELIMITER //

CREATE PROCEDURE tt_product_tree(
  IN p_idgrp INT,
  IN p_idsgrp INT,
  IN p_filter VARCHAR(255)
)
BEGIN
  IF p_idgrp IS NULL AND p_filter IS NOT NULL THEN
    SELECT CONCAT(pg.id, '/', sg.id, '/', p.id) AS `key`,
           p.nr AS title,
           CONCAT_WS('/', pg.nr, sg.nr, p.nr) AS nrPath,
           p.name,
           CONCAT_WS('/', pg.name, sg.name, p.name) AS displayName,
           FALSE AS folder,
           FALSE AS lazy
      FROM product p
      LEFT JOIN product_sgrp sg ON p.idproduct_sgrp = sg.id
      LEFT JOIN product_grp pg ON sg.idproduct_grp = pg.id
     WHERE UPPER(CONVERT(pg.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(pg.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(sg.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(sg.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(p.nr USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
        OR UPPER(CONVERT(p.name USING utf8mb4)) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', UPPER(CONVERT(p_filter USING utf8mb4)), '%') COLLATE utf8mb4_unicode_ci
     ORDER BY displayName, title;
  ELSEIF p_idgrp IS NOT NULL AND p_idsgrp IS NOT NULL THEN
    SELECT CONCAT(p_idgrp, '/', p_idsgrp, '/', p.id) AS `key`,
           p.nr AS title,
           CONCAT_WS('/', g.nr, s.nr, p.nr) AS nrPath,
           p.name
      FROM product p
      LEFT JOIN product_sgrp s ON p.idproduct_sgrp = s.id
      LEFT JOIN product_grp g ON s.idproduct_grp = g.id
     WHERE p.idproduct_sgrp = p_idsgrp
     ORDER BY 2;
  ELSEIF p_idgrp IS NOT NULL THEN
    SELECT CONCAT(p_idgrp, '/', s.id) AS `key`,
           s.nr AS title,
           CONCAT_WS('/', g.nr, s.nr) AS nrPath,
           s.name,
           TRUE AS folder,
           TRUE AS lazy,
           (SELECT COUNT(*) FROM product p WHERE p.idproduct_sgrp = s.id) AS count
      FROM product_sgrp s
      LEFT JOIN product_grp g ON s.idproduct_grp = g.id
     WHERE s.idproduct_grp = p_idgrp
     ORDER BY 2;
  ELSE
    SELECT id AS `key`,
           nr AS title,
           nr AS nrPath,
           id,
           nr,
           name,
           TRUE AS folder,
           TRUE AS lazy,
           (SELECT COUNT(*) FROM product_sgrp s WHERE s.idproduct_grp = product_grp.id) AS count
      FROM product_grp
     WHERE id > 0
     ORDER BY 2;
  END IF;
END//

DELIMITER ;


-- tt_product_update.sql
DROP PROCEDURE IF EXISTS tt_product_update;

DELIMITER //

CREATE PROCEDURE tt_product_update(
  IN p_idgrp INT,
  IN p_idsgrp INT,
  IN p_id INT,
  IN p_nr VARCHAR(255),
  IN p_name VARCHAR(255)
)
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE product SET nr = p_nr, name = p_name WHERE id > 0 AND id = p_id;
    SELECT * FROM product WHERE id = p_id;
  ELSEIF p_idsgrp IS NOT NULL THEN
    UPDATE product_sgrp SET nr = p_nr, name = p_name WHERE id > 0 AND id = p_idsgrp;
    SELECT * FROM product_sgrp WHERE id = p_idsgrp;
  ELSE
    UPDATE product_grp SET nr = p_nr, name = p_name WHERE id > 0 AND id = p_idgrp;
    SELECT * FROM product_grp WHERE id = p_idgrp;
  END IF;
END//

DELIMITER ;


-- tt_report_detailed.sql
DROP PROCEDURE IF EXISTS tt_report_detailed;
DELIMITER //
CREATE PROCEDURE tt_report_detailed(IN p_date VARCHAR(10), IN p_dfrom VARCHAR(10), IN p_dto VARCHAR(10), IN p_idplace INT, IN p_idstep INT, IN p_idworker INT, IN p_idproduct_grp INT, IN p_hu INT)
BEGIN
  SELECT DATE_FORMAT(dt,'%d-%m-%Y') AS d, DATE_FORMAT(dt,'%H:%i:%s') AS t,
         sec, idplace, idstep, idworker, hu, idproduct_grp
    FROM tt_v_event
   WHERE (p_dfrom IS NULL OR DATE(dt) >= COALESCE(STR_TO_DATE(p_dfrom,'%Y-%m-%d'), STR_TO_DATE(p_dfrom,'%d-%m-%Y')))
     AND (p_dto IS NULL OR DATE(dt) <= COALESCE(STR_TO_DATE(p_dto,'%Y-%m-%d'), STR_TO_DATE(p_dto,'%d-%m-%Y')))
     AND (p_idplace IS NULL OR idplace = p_idplace)
     AND (p_idstep IS NULL OR idstep = p_idstep)
     AND (p_idworker IS NULL OR idworker = p_idworker)
     AND (p_idproduct_grp IS NULL OR idproduct_grp = p_idproduct_grp)
     AND (p_hu IS NULL OR hu = p_hu)
   ORDER BY dt DESC LIMIT 1000;
END//
DELIMITER ;


-- tt_report_detailed_tree.sql
DROP PROCEDURE IF EXISTS tt_report_detailed_tree;
DELIMITER //
CREATE PROCEDURE tt_report_detailed_tree(IN p_date VARCHAR(10), IN p_dfrom VARCHAR(10), IN p_dto VARCHAR(10), IN p_idplace INT, IN p_idstep INT, IN p_idworker INT, IN p_idproduct_grp INT, IN p_hu INT)
BEGIN
  SELECT DATE_FORMAT(dt,'%Y-%m-%d') AS `key`, DATE_FORMAT(dt,'%d-%m-%Y') AS title,
         TRUE AS folder, TRUE AS lazy, COUNT(*) AS count, SUM(IFNULL(sec, 0)) AS sec
    FROM tt_v_event
   WHERE (p_dfrom IS NULL OR DATE(dt) >= COALESCE(STR_TO_DATE(p_dfrom,'%Y-%m-%d'), STR_TO_DATE(p_dfrom,'%d-%m-%Y')))
     AND (p_dto IS NULL OR DATE(dt) <= COALESCE(STR_TO_DATE(p_dto,'%Y-%m-%d'), STR_TO_DATE(p_dto,'%d-%m-%Y')))
     AND (p_idplace IS NULL OR idplace = p_idplace)
     AND (p_idstep IS NULL OR idstep = p_idstep)
     AND (p_idworker IS NULL OR idworker = p_idworker)
     AND (p_idproduct_grp IS NULL OR idproduct_grp = p_idproduct_grp)
     AND (p_hu IS NULL OR hu = p_hu)
   GROUP BY 1 ORDER BY 1 DESC;
END//
DELIMITER ;


-- tt_report_detailed_tree_rows.sql
DROP PROCEDURE IF EXISTS tt_report_detailed_tree_rows;
DELIMITER //
CREATE PROCEDURE tt_report_detailed_tree_rows(IN p_date VARCHAR(10), IN p_dfrom VARCHAR(10), IN p_dto VARCHAR(10), IN p_idplace INT, IN p_idstep INT, IN p_idworker INT, IN p_idproduct_grp INT, IN p_hu INT)
BEGIN
  SELECT CONCAT(DATE_FORMAT(e.dt,'%Y%m%d%H%i%s'), '-', e.idplace, '-', e.idstep, '-', e.idworker, '-', e.hu, '-', e.idproduct_grp) AS `key`,
         DATE_FORMAT(e.dt,'%H:%i:%s') AS title, FALSE AS folder, FALSE AS lazy, IFNULL(e.sec, 0) AS sec,
         CONCAT(pl.id, ' - ', pl.name) AS place, CONCAT(st.nr, ' - ', st.name) AS step,
         CONCAT(w.nr, ' - ', w.name) AS worker, CONCAT(pg.nr, ' - ', pg.name) AS product_grp, e.hu AS hu
    FROM tt_v_event e
    LEFT JOIN tt_place pl ON pl.id = e.idplace
    LEFT JOIN step st ON st.id = e.idstep
    LEFT JOIN worker w ON w.id = e.idworker
    LEFT JOIN product_grp pg ON pg.id = e.idproduct_grp
   WHERE DATE(e.dt) = STR_TO_DATE(p_date,'%Y-%m-%d')
     AND (p_dfrom IS NULL OR DATE(e.dt) >= COALESCE(STR_TO_DATE(p_dfrom,'%Y-%m-%d'), STR_TO_DATE(p_dfrom,'%d-%m-%Y')))
     AND (p_dto IS NULL OR DATE(e.dt) <= COALESCE(STR_TO_DATE(p_dto,'%Y-%m-%d'), STR_TO_DATE(p_dto,'%d-%m-%Y')))
     AND (p_idplace IS NULL OR e.idplace = p_idplace)
     AND (p_idstep IS NULL OR e.idstep = p_idstep)
     AND (p_idworker IS NULL OR e.idworker = p_idworker)
     AND (p_idproduct_grp IS NULL OR e.idproduct_grp = p_idproduct_grp)
     AND (p_hu IS NULL OR e.hu = p_hu)
   ORDER BY e.dt DESC;
END//
DELIMITER ;


-- tt_report_detailed_xlsx.sql
DROP PROCEDURE IF EXISTS tt_report_detailed_xlsx;
DELIMITER //
CREATE PROCEDURE tt_report_detailed_xlsx(IN p_date VARCHAR(10), IN p_dfrom VARCHAR(10), IN p_dto VARCHAR(10), IN p_idplace INT, IN p_idstep INT, IN p_idworker INT, IN p_idproduct_grp INT, IN p_hu INT)
BEGIN
  SELECT DATE_FORMAT(e.dt,'%d-%m-%Y') AS d, DATE_FORMAT(e.dt,'%H:%i:%s') AS t, IFNULL(e.sec, 0) AS sec,
         CONCAT(pl.id, ' - ', pl.name) AS place, CONCAT(st.nr, ' - ', st.name) AS step,
         CONCAT(w.nr, ' - ', w.name) AS worker, CONCAT(pg.nr, ' - ', pg.name) AS product_grp, e.hu AS hu
    FROM tt_v_event e
    LEFT JOIN tt_place pl ON pl.id = e.idplace
    LEFT JOIN step st ON st.id = e.idstep
    LEFT JOIN worker w ON w.id = e.idworker
    LEFT JOIN product_grp pg ON pg.id = e.idproduct_grp
   WHERE (p_dfrom IS NULL OR DATE(e.dt) >= COALESCE(STR_TO_DATE(p_dfrom,'%Y-%m-%d'), STR_TO_DATE(p_dfrom,'%d-%m-%Y')))
     AND (p_dto IS NULL OR DATE(e.dt) <= COALESCE(STR_TO_DATE(p_dto,'%Y-%m-%d'), STR_TO_DATE(p_dto,'%d-%m-%Y')))
     AND (p_idplace IS NULL OR e.idplace = p_idplace)
     AND (p_idstep IS NULL OR e.idstep = p_idstep)
     AND (p_idworker IS NULL OR e.idworker = p_idworker)
     AND (p_idproduct_grp IS NULL OR e.idproduct_grp = p_idproduct_grp)
     AND (p_hu IS NULL OR e.hu = p_hu)
   ORDER BY e.dt DESC LIMIT 1000;
END//
DELIMITER ;


-- tt_report_dict_places.sql
DROP PROCEDURE IF EXISTS tt_report_dict_places;
DELIMITER //
CREATE PROCEDURE tt_report_dict_places()
BEGIN
  SELECT id, CONCAT(id, ' - ', name) AS fullname FROM tt_place WHERE id > 0 ORDER BY id;
END//
DELIMITER ;


-- tt_report_dict_product_groups.sql
DROP PROCEDURE IF EXISTS tt_report_dict_product_groups;
DELIMITER //
CREATE PROCEDURE tt_report_dict_product_groups()
BEGIN
  SELECT id, CONCAT(nr, ' - ', name) AS fullname FROM product_grp WHERE id > 0 ORDER BY nr;
END//
DELIMITER ;


-- tt_report_dict_steps.sql
DROP PROCEDURE IF EXISTS tt_report_dict_steps;
DELIMITER //
CREATE PROCEDURE tt_report_dict_steps()
BEGIN
  SELECT id, CONCAT(nr, ' - ', name) AS fullname FROM step WHERE id > 0 ORDER BY nr;
END//
DELIMITER ;


-- tt_report_dict_workers.sql
DROP PROCEDURE IF EXISTS tt_report_dict_workers;
DELIMITER //
CREATE PROCEDURE tt_report_dict_workers()
BEGIN
  SELECT id, CONCAT(nr, ' - ', name) AS fullname FROM worker WHERE id > 0 ORDER BY 0 + nr;
END//
DELIMITER ;


-- tt_report_service_days.sql
DROP PROCEDURE IF EXISTS tt_report_service_days;
DELIMITER //
CREATE PROCEDURE tt_report_service_days(IN p_year VARCHAR(4), IN p_month VARCHAR(2))
BEGIN
  SELECT CONCAT(p_year, '/', p_month, '/', DATE_FORMAT(dt,'%d')) AS `key`, DATE_FORMAT(dt,'%d/%m/%Y') AS title,
         TRUE AS folder, TRUE AS lazy, COUNT(*) AS count, SUM(IF(hu=-1, sec, 0)) AS setup, SUM(IF(hu=-2, sec, 0)) AS repair
	    FROM tt_v_event
	   WHERE hu < 0
	     AND YEAR(dt) = CAST(p_year AS UNSIGNED)
	     AND MONTH(dt) = CAST(p_month AS UNSIGNED)
	   GROUP BY 1 ORDER BY 1;
END//
DELIMITER ;


-- tt_report_service_months.sql
DROP PROCEDURE IF EXISTS tt_report_service_months;
DELIMITER //
CREATE PROCEDURE tt_report_service_months(IN p_year VARCHAR(4))
BEGIN
  SELECT CONCAT(p_year, '/', DATE_FORMAT(dt,'%m')) AS `key`, DATE_FORMAT(dt,'%M') AS title,
         TRUE AS folder, TRUE AS lazy, COUNT(*) AS count, SUM(IF(hu=-1, sec, 0)) AS setup, SUM(IF(hu=-2, sec, 0)) AS repair
	    FROM tt_v_event
	   WHERE hu < 0
	     AND YEAR(dt) = CAST(p_year AS UNSIGNED)
	   GROUP BY 1 ORDER BY 1;
END//
DELIMITER ;


-- tt_report_service_places.sql
DROP PROCEDURE IF EXISTS tt_report_service_places;
DELIMITER //
CREATE PROCEDURE tt_report_service_places(IN p_year VARCHAR(4), IN p_month VARCHAR(2), IN p_day VARCHAR(2))
BEGIN
  SELECT CONCAT(p_year, '/', p_month, '/', p_day, '/', e.idplace) AS `key`, p.name AS title,
         TRUE AS folder, TRUE AS lazy, COUNT(*) AS count, SUM(IF(hu=-1, sec, 0)) AS setup, SUM(IF(hu=-2, sec, 0)) AS repair
    FROM tt_v_event e INNER JOIN tt_place p ON p.id = e.idplace
	   WHERE e.hu < 0
	     AND YEAR(e.dt) = CAST(p_year AS UNSIGNED)
	     AND MONTH(e.dt) = CAST(p_month AS UNSIGNED)
	     AND DAY(e.dt) = CAST(p_day AS UNSIGNED)
   GROUP BY 1 ORDER BY 1;
END//
DELIMITER ;


-- tt_report_service_workers.sql
DROP PROCEDURE IF EXISTS tt_report_service_workers;
DELIMITER //
CREATE PROCEDURE tt_report_service_workers(IN p_year VARCHAR(4), IN p_month VARCHAR(2), IN p_day VARCHAR(2), IN p_idplace INT)
BEGIN
  SELECT 0 AS `key`, CONCAT(DATE_FORMAT(e.dt,'%h:%i:%s'), ' - [', w.nr, '] ', w.name) AS title,
         FALSE AS folder, FALSE AS lazy, IF(hu=-1, sec, 0) AS setup, IF(hu=-2, sec, 0) AS repair
    FROM tt_v_event e INNER JOIN worker w ON w.id = e.idworker
	   WHERE e.hu < 0
	     AND YEAR(e.dt) = CAST(p_year AS UNSIGNED)
	     AND MONTH(e.dt) = CAST(p_month AS UNSIGNED)
	     AND DAY(e.dt) = CAST(p_day AS UNSIGNED)
     AND e.idplace = p_idplace
   ORDER BY 2;
END//
DELIMITER ;


-- tt_report_service_years.sql
DROP PROCEDURE IF EXISTS tt_report_service_years;
DELIMITER //
CREATE PROCEDURE tt_report_service_years()
BEGIN
  SELECT DATE_FORMAT(dt,'%Y') AS `key`, DATE_FORMAT(dt,'%Y') AS title, TRUE AS folder, TRUE AS lazy,
         COUNT(*) AS count, SUM(IF(hu=-1, sec, 0)) AS setup, SUM(IF(hu=-2, sec, 0)) AS repair
    FROM tt_v_event WHERE hu < 0 GROUP BY 1 ORDER BY 1;
END//
DELIMITER ;


-- tt_tag_apply.sql
DROP PROCEDURE IF EXISTS tt_tag_apply;

DELIMITER //

CREATE PROCEDURE tt_tag_apply(
  IN p_tag VARCHAR(8),
  IN p_data VARCHAR(64)
)
BEGIN
  IF LEFT(p_data, 1) = 'W' THEN
    CALL tt_tag_assign_worker(p_tag, SUBSTRING(p_data, 2));
  ELSEIF LEFT(p_data, 1) = 'S' THEN
    CALL tt_tag_assign_step(p_tag, SUBSTRING(p_data, 2));
  ELSEIF LEFT(p_data, 2) = 'HU' AND LENGTH(p_data) > 2 THEN
    CALL tt_tag_assign_hu(p_tag, CAST(SUBSTRING(p_data, 3) AS SIGNED));
  ELSEIF p_data REGEXP '^[-+]?[0-9]+$' THEN
    CALL tt_tag_assign_hu(p_tag, CAST(p_data AS SIGNED));
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wrong data';
  END IF;
END//

DELIMITER ;


-- tt_tag_assign_hu.sql
DROP PROCEDURE IF EXISTS tt_tag_assign_hu;

DELIMITER //

CREATE PROCEDURE tt_tag_assign_hu(
  IN p_tag VARCHAR(8),
  IN p_hu INT
)
BEGIN
  UPDATE tag_hu
     SET hu = p_hu
   WHERE tag = p_tag;
END//

DELIMITER ;


-- tt_tag_assign_step.sql
DROP PROCEDURE IF EXISTS tt_tag_assign_step;

DELIMITER //

CREATE PROCEDURE tt_tag_assign_step(
  IN p_tag VARCHAR(8),
  IN p_step_nr VARCHAR(64)
)
BEGIN
  UPDATE tag_step
     SET idstep = (SELECT id FROM step WHERE nr = p_step_nr)
   WHERE tag = p_tag;
END//

DELIMITER ;


-- tt_tag_assign_worker.sql
DROP PROCEDURE IF EXISTS tt_tag_assign_worker;

DELIMITER //

CREATE PROCEDURE tt_tag_assign_worker(
  IN p_tag VARCHAR(8),
  IN p_worker_nr VARCHAR(64)
)
BEGIN
  UPDATE tag_worker
     SET idworker = (SELECT id FROM worker WHERE nr = p_worker_nr)
   WHERE tag = p_tag;
END//

DELIMITER ;


-- tt_tag_register.sql
DROP PROCEDURE IF EXISTS tt_tag_register;

DELIMITER //

CREATE PROCEDURE tt_tag_register(
  IN p_type VARCHAR(16),
  IN p_tag VARCHAR(8)
)
BEGIN
  IF p_type = 'worker' THEN
    INSERT IGNORE INTO tag_worker (tag) VALUES (p_tag);
  ELSEIF p_type = 'step' THEN
    INSERT IGNORE INTO tag_step (tag) VALUES (p_tag);
  ELSEIF p_type = 'hu' THEN
    INSERT IGNORE INTO tag_hu (tag) VALUES (p_tag);
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wrong tag type';
  END IF;
END//

DELIMITER ;


-- tt_user_by_tag.sql
DROP PROCEDURE IF EXISTS tt_user_by_tag;

DELIMITER //

CREATE PROCEDURE tt_user_by_tag(
  IN p_tag VARCHAR(8)
)
BEGIN
  SELECT w.id,
         w.name,
         i.img
    FROM worker w
    LEFT OUTER JOIN worker_img i ON i.idworker = w.id
   WHERE w.id = (SELECT idworker FROM tag_worker WHERE tag = p_tag);
END//

DELIMITER ;


-- upload_tt_devices.sql
DROP PROCEDURE IF EXISTS upload_tt_devices;

DELIMITER //

CREATE PROCEDURE upload_tt_devices(
  IN p_devices TEXT
)
BEGIN
  DECLARE v_text TEXT DEFAULT REPLACE(REPLACE(p_devices, '\r', ''), '\n', ',');
  DECLARE v_token VARCHAR(255);
  DECLARE v_pos INT DEFAULT 0;

  WHILE v_text IS NOT NULL AND LENGTH(TRIM(v_text)) > 0 DO
    SET v_pos = LOCATE(',', v_text);
    IF v_pos = 0 THEN
      SET v_token = TRIM(v_text);
      SET v_text = '';
    ELSE
      SET v_token = TRIM(SUBSTRING(v_text, 1, v_pos - 1));
      SET v_text = SUBSTRING(v_text, v_pos + 1);
    END IF;

    IF LENGTH(v_token) > 0 THEN
      INSERT IGNORE INTO tt_place (nr) VALUES (v_token);
    END IF;
  END WHILE;

  SELECT ROW_COUNT() AS affectedRows;
END//

DELIMITER ;


-- wh_Delete_doc_item.sql
DROP PROCEDURE IF EXISTS wh_Delete_doc_item;
DELIMITER //
CREATE PROCEDURE wh_Delete_doc_item(IN p_iddoc INT, IN p_iditem INT)
BEGIN
  DELETE FROM wh_doc_item
   WHERE iddoc = p_iddoc
     AND (p_iditem IS NULL OR iditem = p_iditem);
END//
DELIMITER ;


-- wh_Delete_group.sql
DROP PROCEDURE IF EXISTS wh_Delete_group;
DELIMITER //
CREATE PROCEDURE wh_Delete_group(IN p_id INT)
BEGIN
  IF EXISTS (SELECT 1 FROM wh_grp WHERE parent_grp_id = p_id) OR EXISTS (SELECT 1 FROM wh_item WHERE idgrp = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group is not empty';
  END IF;
  DELETE FROM wh_grp WHERE id = p_id;
END//
DELIMITER ;


-- wh_Delete_item.sql
DROP PROCEDURE IF EXISTS wh_Delete_item;
DELIMITER //
CREATE PROCEDURE wh_Delete_item(IN p_id INT)
BEGIN
  DELETE FROM wh_item_img WHERE iditem = p_id;
  DELETE FROM wh_item WHERE id = p_id;
END//
DELIMITER ;


-- wh_Get_group_exists.sql
DROP PROCEDURE IF EXISTS wh_Get_group_exists;
DELIMITER //
CREATE PROCEDURE wh_Get_group_exists(IN p_id INT)
BEGIN
  SELECT id FROM wh_grp WHERE id = p_id;
END//
DELIMITER ;


-- wh_Get_groups.sql
DROP PROCEDURE IF EXISTS wh_Get_groups;
DELIMITER //
CREATE PROCEDURE wh_Get_groups()
BEGIN
  SELECT id, name, parent_grp_id FROM wh_grp ORDER BY name;
END//
DELIMITER ;


-- wh_Get_item.sql
DROP PROCEDURE IF EXISTS wh_Get_item;
DELIMITER //
CREATE PROCEDURE wh_Get_item(IN p_id INT)
BEGIN
  SELECT i.id, i.name, i.nr, i.idgrp, g.name AS grp, i.vendor, i.minQty, i.itemNo, i.price, img.img
    FROM wh_item i
    LEFT JOIN wh_grp g ON g.id = i.idgrp
    LEFT JOIN wh_item_img img ON img.iditem = i.id
   WHERE i.id = p_id;
END//
DELIMITER ;


-- wh_Get_item_last10.sql
DROP PROCEDURE IF EXISTS wh_Get_item_last10;
DELIMITER //
CREATE PROCEDURE wh_Get_item_last10(IN p_id INT)
BEGIN
  SELECT d.id AS iddoc,
         DATE_FORMAT(d.dt, '%d-%m-%Y %H:%i') AS d,
         d.grp,
         d.name,
         w.nr AS worker_nr,
         w.name AS worker_name,
         CONCAT(IFNULL(w.nr, ''), IF(w.nr IS NULL OR w.name IS NULL, '', ' - '), IFNULL(w.name, '')) AS worker,
         di.iditem,
         di.qty,
         di.price
    FROM wh_doc_item di
    JOIN wh_doc d ON d.id = di.iddoc
    LEFT JOIN worker w ON w.id = d.idworker
   WHERE di.iditem = p_id
   ORDER BY d.dt DESC
   LIMIT 10;
END//
DELIMITER ;


-- wh_Get_vendors.sql
DROP PROCEDURE IF EXISTS wh_Get_vendors;
DELIMITER //
CREATE PROCEDURE wh_Get_vendors()
BEGIN
  SELECT DISTINCT vendor FROM wh_item WHERE vendor IS NOT NULL AND vendor <> '' ORDER BY vendor;
END//
DELIMITER ;


-- wh_Get_workers.sql
DROP PROCEDURE IF EXISTS wh_Get_workers;
DELIMITER //
CREATE PROCEDURE wh_Get_workers()
BEGIN
  SELECT id, nr, name, CONCAT(nr, ' - ', name) AS fullname FROM worker ORDER BY 0 + nr;
END//
DELIMITER ;


-- wh_Is_empty.sql
DROP PROCEDURE IF EXISTS wh_Is_empty;
DELIMITER //
CREATE PROCEDURE wh_Is_empty(IN p_id INT)
BEGIN
  SELECT (
    (SELECT COUNT(*) FROM wh_grp WHERE parent_grp_id = p_id) = 0
    AND
    (SELECT COUNT(*) FROM wh_item WHERE idgrp = p_id) = 0
  ) AS empty;
END//
DELIMITER ;


-- wh_Post_group.sql
DROP PROCEDURE IF EXISTS wh_Post_group;
DELIMITER //
CREATE PROCEDURE wh_Post_group(IN p_name VARCHAR(255))
BEGIN
  INSERT INTO wh_grp (name) VALUES (p_name);
  SELECT LAST_INSERT_ID() AS id;
END//
DELIMITER ;


-- wh_Post_group_child.sql
DROP PROCEDURE IF EXISTS wh_Post_group_child;
DELIMITER //
CREATE PROCEDURE wh_Post_group_child(IN p_name VARCHAR(255), IN p_parentId INT)
BEGIN
  INSERT INTO wh_grp (name, parent_grp_id) VALUES (p_name, p_parentId);
  SELECT LAST_INSERT_ID() AS id;
END//
DELIMITER ;


-- wh_Post_item.sql
DROP PROCEDURE IF EXISTS wh_Post_item;
DELIMITER //
CREATE PROCEDURE wh_Post_item(IN p_name VARCHAR(255), IN p_groupId INT, IN p_vendor VARCHAR(255), IN p_minQty DECIMAL(18,6), IN p_nr VARCHAR(255), IN p_itemNo VARCHAR(255), IN p_price DECIMAL(18,6))
BEGIN
  INSERT INTO wh_item (name, idgrp, vendor, minQty, nr, itemNo, price)
  VALUES (p_name, p_groupId, p_vendor, p_minQty, p_nr, p_itemNo, p_price);
  SELECT LAST_INSERT_ID() AS id;
END//
DELIMITER ;


-- wh_Post_stock_batch.sql
DROP PROCEDURE IF EXISTS wh_Post_stock_batch;
DELIMITER //
CREATE PROCEDURE wh_Post_stock_batch(IN p_op VARCHAR(32), IN p_userid INT, IN p_doc VARCHAR(255), IN p_items JSON)
BEGIN
  DECLARE v_iddoc INT;
  INSERT INTO wh_doc (grp, idworker, name) VALUES (p_op, p_userid, p_doc);
  SET v_iddoc = LAST_INSERT_ID();

  INSERT INTO wh_doc_item (iddoc, iditem, qty)
  SELECT v_iddoc,
         jt.iditem,
         CASE
           WHEN p_op = 'Incoming' THEN jt.qty
           WHEN p_op = 'Outgoing' THEN -jt.qty
           WHEN p_op = 'Inventory' THEN jt.qty - IFNULL(SUM(wdi.qty), 0)
         END
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
      iditem INT PATH '$.iditem',
      qty DECIMAL(18,6) PATH '$.qty'
    )) jt
    LEFT JOIN wh_doc_item wdi ON wdi.iditem = jt.iditem
   GROUP BY jt.iditem, jt.qty;
END//
DELIMITER ;


-- wh_Put_group.sql
DROP PROCEDURE IF EXISTS wh_Put_group;
DELIMITER //
CREATE PROCEDURE wh_Put_group(IN p_id INT, IN p_name VARCHAR(255))
BEGIN
  UPDATE wh_grp SET name = p_name WHERE id = p_id;
END//
DELIMITER ;


-- wh_Put_item.sql
DROP PROCEDURE IF EXISTS wh_Put_item;
DELIMITER //
CREATE PROCEDURE wh_Put_item(IN p_id INT, IN p_name VARCHAR(255), IN p_idgrp INT, IN p_vendor VARCHAR(255), IN p_minQty DECIMAL(18,6), IN p_nr VARCHAR(255), IN p_itemNo VARCHAR(255), IN p_price DECIMAL(18,6))
BEGIN
  UPDATE wh_item
     SET name = p_name,
         idgrp = p_idgrp,
         vendor = p_vendor,
         minQty = p_minQty,
         nr = p_nr,
         itemNo = p_itemNo,
         price = p_price
   WHERE id = p_id;
END//
DELIMITER ;


-- wh_Put_item_img.sql
DROP PROCEDURE IF EXISTS wh_Put_item_img;
DELIMITER //
CREATE PROCEDURE wh_Put_item_img(IN p_iditem INT, IN p_img LONGTEXT)
BEGIN
  INSERT INTO wh_item_img (iditem, img)
  VALUES (p_iditem, p_img)
  ON DUPLICATE KEY UPDATE img = VALUES(img);
END//
DELIMITER ;


-- wh_Tree_items.sql
DROP PROCEDURE IF EXISTS wh_Tree_items;
DELIMITER //
CREATE PROCEDURE wh_Tree_items(IN p_idgrp INT, IN p_name VARCHAR(255), IN p_itemNo VARCHAR(255), IN p_nr VARCHAR(255), IN p_vendor VARCHAR(255))
BEGIN
  SELECT g.id AS `key`, g.name AS title, TRUE AS folder, TRUE AS lazy,
         (
           SELECT COUNT(*)
             FROM wh_grp cg
            WHERE cg.parent_grp_id = g.id
         ) +
         (
           SELECT COUNT(*)
             FROM wh_item wi
            WHERE wi.idgrp = g.id
         ) AS count
    FROM wh_grp g
   WHERE p_name IS NULL AND p_itemNo IS NULL AND p_nr IS NULL AND p_vendor IS NULL
     AND ((p_idgrp IS NULL AND g.parent_grp_id IS NULL) OR g.parent_grp_id = p_idgrp)
   ORDER BY title;

  SELECT T.id AS `key`, T.name AS title, FALSE AS folder, FALSE AS lazy,
         T.nr, T.vendor, T.itemNo, T.price, T.minQty, T.idgrp, IFNULL(SUM(D.qty), 0) AS stock
    FROM wh_v_item_without_img T
    LEFT JOIN wh_doc_item D ON D.iditem = T.id
   WHERE ((p_name IS NOT NULL OR p_itemNo IS NOT NULL OR p_nr IS NOT NULL OR p_vendor IS NOT NULL)
          OR (p_idgrp IS NULL AND T.idgrp IS NULL)
          OR T.idgrp = p_idgrp)
     AND (p_name IS NULL OR T.name LIKE CONCAT('%', p_name, '%'))
     AND (p_itemNo IS NULL OR T.itemNo LIKE CONCAT('%', p_itemNo, '%'))
     AND (p_nr IS NULL OR T.nr LIKE CONCAT('%', p_nr, '%'))
     AND (p_vendor IS NULL OR T.vendor LIKE CONCAT('%', p_vendor, '%'))
   GROUP BY T.id, T.nr, T.name, T.vendor, T.itemNo, T.price, T.minQty, T.idgrp
   ORDER BY T.name;
END//
DELIMITER ;


-- wh_doc_post.sql
DROP PROCEDURE IF EXISTS wh_doc_post;
DELIMITER //
CREATE PROCEDURE wh_doc_post(IN p_barcode VARCHAR(255), IN p_action VARCHAR(32), IN p_description VARCHAR(255), IN p_items JSON)
BEGIN
  DECLARE v_idworker INT;
  DECLARE v_iddoc INT;

  START TRANSACTION;

  SELECT id INTO v_idworker FROM worker WHERE nr LIKE p_barcode LIMIT 1;
  INSERT INTO wh_doc (grp, idworker, name) VALUES (p_action, v_idworker, p_description);
  SET v_iddoc = LAST_INSERT_ID();

  INSERT INTO wh_doc_item (iddoc, iditem, qty, price)
  SELECT v_iddoc,
         it.id,
         CASE
           WHEN p_action = 'Incoming' THEN jt.qty
           WHEN p_action = 'Outgoing' THEN -jt.qty
           ELSE jt.qty - IFNULL(st.stock, 0)
         END,
         it.price
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
      storage VARCHAR(255) PATH '$.storage',
      qty DECIMAL(18,6) PATH '$.qty'
    )) jt
    JOIN wh_item it ON it.nr LIKE jt.storage
    LEFT JOIN wh_v_item_without_img st ON st.id = it.id;

  DELETE o
    FROM wh_order o
    JOIN JSON_TABLE(p_items, '$[*]' COLUMNS (storage VARCHAR(255) PATH '$.storage')) jt
    JOIN wh_item it ON it.nr LIKE jt.storage
   WHERE o.idworker = v_idworker
     AND o.iditem = it.id;

  COMMIT;
  SELECT 'Ok' AS Result;
END//
DELIMITER ;


-- wh_doc_scan.sql
DROP PROCEDURE IF EXISTS wh_doc_scan;
DELIMITER //
CREATE PROCEDURE wh_doc_scan(IN p_barcode VARCHAR(255), IN p_action VARCHAR(32))
BEGIN
  DECLARE v_idworker INT;
  SELECT id INTO v_idworker FROM worker WHERE nr LIKE p_barcode LIMIT 1;

  SELECT id, nr, name FROM worker WHERE id = v_idworker;

  SELECT i.id, i.nr, i.name, i.itemNo, o.qty AS exp_qty, i.stock, i.img
    FROM wh_order o INNER JOIN wh_v_item i ON i.id = o.iditem
   WHERE o.idworker = v_idworker
     AND p_action = 'Outgoing'
   ORDER BY 1;
END//
DELIMITER ;


-- wh_item_info.sql
DROP PROCEDURE IF EXISTS wh_item_info;
DELIMITER //
CREATE PROCEDURE wh_item_info(IN p_id INT)
BEGIN
  SELECT nr, name, itemNo FROM wh_item WHERE id = p_id;
END//
DELIMITER ;


-- wh_order_delete.sql
DROP PROCEDURE IF EXISTS wh_order_delete;
DELIMITER //
CREATE PROCEDURE wh_order_delete(IN p_idworker INT, IN p_iditem INT)
BEGIN
  DELETE FROM wh_order WHERE idworker = p_idworker AND iditem = p_iditem;
END//
DELIMITER ;


-- wh_order_insert.sql
DROP PROCEDURE IF EXISTS wh_order_insert;
DELIMITER //
CREATE PROCEDURE wh_order_insert(IN p_idworker INT, IN p_iditem INT, IN p_qty DECIMAL(18,6), IN p_dtarget DATE)
BEGIN
  INSERT INTO wh_order (idworker, iditem, qty, dtarget)
  VALUES (p_idworker, p_iditem, p_qty, p_dtarget);
END//
DELIMITER ;


-- wh_order_list.sql
DROP PROCEDURE IF EXISTS wh_order_list;
DELIMITER //
CREATE PROCEDURE wh_order_list(IN p_idworker INT)
BEGIN
  SELECT o.iditem, t.nr, o.qty, o.dtarget
    FROM wh_order o INNER JOIN wh_item t ON t.id = o.iditem
   WHERE o.idworker = p_idworker
   ORDER BY t.nr;
END//
DELIMITER ;


-- wh_order_workers.sql
DROP PROCEDURE IF EXISTS wh_order_workers;
DELIMITER //
CREATE PROCEDURE wh_order_workers()
BEGIN
  SELECT id, CONCAT(nr, ' - ', name) AS fullname FROM worker ORDER BY 0 + nr;
END//
DELIMITER ;


-- wh_report_detailed.sql
DROP PROCEDURE IF EXISTS wh_report_detailed;
DELIMITER //
CREATE PROCEDURE wh_report_detailed(
  IN p_year VARCHAR(4), IN p_month VARCHAR(2), IN p_day VARCHAR(2), IN p_iddoc INT,
  IN p_doc_grp VARCHAR(255), IN p_doc_name VARCHAR(255), IN p_worker_grp VARCHAR(255), IN p_worker_name VARCHAR(255), IN p_worker_nr VARCHAR(255),
  IN p_item_grp VARCHAR(255), IN p_item_name VARCHAR(255), IN p_item_nr VARCHAR(255), IN p_item_itemNo VARCHAR(255), IN p_item_vendor VARCHAR(255)
)
BEGIN
  IF p_iddoc IS NOT NULL THEN
    SELECT CONCAT(p_year, '/', p_month, '/', p_day, '/', p_iddoc, '/', i.iditem) AS `key`,
           CONCAT('[', it.nr, '] ', it.name, '; price: ', i.price) AS title,
           FALSE AS folder, FALSE AS lazy, i.qty AS qty, i.qty * i.price AS price
      FROM wh_doc d
     INNER JOIN worker w ON w.id = d.idworker
     INNER JOIN wh_doc_item i ON i.iddoc = d.id
     INNER JOIN wh_item it ON it.id = i.iditem
     WHERE i.iddoc = p_iddoc
       AND (p_doc_grp IS NULL OR d.grp LIKE p_doc_grp)
       AND (p_doc_name IS NULL OR d.name LIKE CONCAT('%', p_doc_name, '%'))
       AND (p_worker_grp IS NULL OR w.grp LIKE p_worker_grp)
       AND (p_worker_name IS NULL OR w.name LIKE CONCAT('%', p_worker_name, '%'))
       AND (p_worker_nr IS NULL OR w.nr LIKE CONCAT('%', p_worker_nr, '%'))
       AND (p_item_grp IS NULL OR it.grp LIKE p_item_grp)
       AND (p_item_name IS NULL OR it.name LIKE CONCAT('%', p_item_name, '%'))
       AND (p_item_nr IS NULL OR it.nr LIKE CONCAT('%', p_item_nr, '%'))
       AND (p_item_itemNo IS NULL OR it.itemNo LIKE CONCAT('%', p_item_itemNo, '%'))
       AND (p_item_vendor IS NULL OR it.vendor LIKE CONCAT('%', p_item_vendor, '%'))
     ORDER BY 2;
  ELSEIF p_day IS NOT NULL THEN
    SELECT CONCAT(p_year, '/', p_month, '/', p_day, '/', d.id) AS `key`,
           CONCAT('[', d.grp, '; ', w.nr, '-', w.name, '] ', d.name) AS title,
           TRUE AS folder, TRUE AS lazy, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS price
      FROM wh_doc d INNER JOIN worker w ON w.id = d.idworker
      INNER JOIN wh_doc_item i ON i.iddoc = d.id INNER JOIN wh_item it ON it.id = i.iditem
     WHERE DATE_FORMAT(d.dt,'%Y/%m/%d') = CONCAT(p_year, '/', p_month, '/', p_day)
       AND (p_doc_grp IS NULL OR d.grp LIKE p_doc_grp)
       AND (p_doc_name IS NULL OR d.name LIKE CONCAT('%', p_doc_name, '%'))
       AND (p_worker_grp IS NULL OR w.grp LIKE p_worker_grp)
       AND (p_worker_name IS NULL OR w.name LIKE CONCAT('%', p_worker_name, '%'))
       AND (p_worker_nr IS NULL OR w.nr LIKE CONCAT('%', p_worker_nr, '%'))
       AND (p_item_grp IS NULL OR it.grp LIKE p_item_grp)
       AND (p_item_name IS NULL OR it.name LIKE CONCAT('%', p_item_name, '%'))
       AND (p_item_nr IS NULL OR it.nr LIKE CONCAT('%', p_item_nr, '%'))
       AND (p_item_itemNo IS NULL OR it.itemNo LIKE CONCAT('%', p_item_itemNo, '%'))
       AND (p_item_vendor IS NULL OR it.vendor LIKE CONCAT('%', p_item_vendor, '%'))
     GROUP BY 1 ORDER BY 1;
  ELSEIF p_month IS NOT NULL THEN
    SELECT CONCAT(p_year, '/', p_month, '/', DATE_FORMAT(d.dt,'%d')) AS `key`,
           DATE_FORMAT(d.dt,'%d/%m/%Y') AS title, TRUE AS folder, TRUE AS lazy,
           SUM(i.qty) AS qty, SUM(i.qty * i.price) AS price
      FROM wh_doc d INNER JOIN worker w ON w.id = d.idworker
      INNER JOIN wh_doc_item i ON i.iddoc = d.id INNER JOIN wh_item it ON it.id = i.iditem
     WHERE DATE_FORMAT(d.dt,'%Y/%m') = CONCAT(p_year, '/', p_month)
       AND (p_doc_grp IS NULL OR d.grp LIKE p_doc_grp)
       AND (p_doc_name IS NULL OR d.name LIKE CONCAT('%', p_doc_name, '%'))
       AND (p_worker_grp IS NULL OR w.grp LIKE p_worker_grp)
       AND (p_worker_name IS NULL OR w.name LIKE CONCAT('%', p_worker_name, '%'))
       AND (p_worker_nr IS NULL OR w.nr LIKE CONCAT('%', p_worker_nr, '%'))
       AND (p_item_grp IS NULL OR it.grp LIKE p_item_grp)
       AND (p_item_name IS NULL OR it.name LIKE CONCAT('%', p_item_name, '%'))
       AND (p_item_nr IS NULL OR it.nr LIKE CONCAT('%', p_item_nr, '%'))
       AND (p_item_itemNo IS NULL OR it.itemNo LIKE CONCAT('%', p_item_itemNo, '%'))
       AND (p_item_vendor IS NULL OR it.vendor LIKE CONCAT('%', p_item_vendor, '%'))
     GROUP BY 1 ORDER BY 1;
  ELSEIF p_year IS NOT NULL THEN
    SELECT CONCAT(p_year, '/', DATE_FORMAT(d.dt,'%m')) AS `key`, DATE_FORMAT(d.dt,'%M') AS title,
           TRUE AS folder, TRUE AS lazy, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS price
      FROM wh_doc d INNER JOIN worker w ON w.id = d.idworker
      INNER JOIN wh_doc_item i ON i.iddoc = d.id INNER JOIN wh_item it ON it.id = i.iditem
     WHERE DATE_FORMAT(d.dt,'%Y') = p_year
       AND (p_doc_grp IS NULL OR d.grp LIKE p_doc_grp)
       AND (p_doc_name IS NULL OR d.name LIKE CONCAT('%', p_doc_name, '%'))
       AND (p_worker_grp IS NULL OR w.grp LIKE p_worker_grp)
       AND (p_worker_name IS NULL OR w.name LIKE CONCAT('%', p_worker_name, '%'))
       AND (p_worker_nr IS NULL OR w.nr LIKE CONCAT('%', p_worker_nr, '%'))
       AND (p_item_grp IS NULL OR it.grp LIKE p_item_grp)
       AND (p_item_name IS NULL OR it.name LIKE CONCAT('%', p_item_name, '%'))
       AND (p_item_nr IS NULL OR it.nr LIKE CONCAT('%', p_item_nr, '%'))
       AND (p_item_itemNo IS NULL OR it.itemNo LIKE CONCAT('%', p_item_itemNo, '%'))
       AND (p_item_vendor IS NULL OR it.vendor LIKE CONCAT('%', p_item_vendor, '%'))
     GROUP BY 1 ORDER BY 1;
  ELSE
    SELECT DATE_FORMAT(d.dt,'%Y') AS `key`, DATE_FORMAT(d.dt,'%Y') AS title,
           TRUE AS folder, TRUE AS lazy, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS price
      FROM wh_doc d INNER JOIN worker w ON w.id = d.idworker
      INNER JOIN wh_doc_item i ON i.iddoc = d.id INNER JOIN wh_item it ON it.id = i.iditem
     WHERE (p_doc_grp IS NULL OR d.grp LIKE p_doc_grp)
       AND (p_doc_name IS NULL OR d.name LIKE CONCAT('%', p_doc_name, '%'))
       AND (p_worker_grp IS NULL OR w.grp LIKE p_worker_grp)
       AND (p_worker_name IS NULL OR w.name LIKE CONCAT('%', p_worker_name, '%'))
       AND (p_worker_nr IS NULL OR w.nr LIKE CONCAT('%', p_worker_nr, '%'))
       AND (p_item_grp IS NULL OR it.grp LIKE p_item_grp)
       AND (p_item_name IS NULL OR it.name LIKE CONCAT('%', p_item_name, '%'))
       AND (p_item_nr IS NULL OR it.nr LIKE CONCAT('%', p_item_nr, '%'))
       AND (p_item_itemNo IS NULL OR it.itemNo LIKE CONCAT('%', p_item_itemNo, '%'))
       AND (p_item_vendor IS NULL OR it.vendor LIKE CONCAT('%', p_item_vendor, '%'))
     GROUP BY 1 ORDER BY 1;
  END IF;
END//
DELIMITER ;


-- wh_report_stock_xlsx.sql
DROP PROCEDURE IF EXISTS wh_report_stock_xlsx;
DELIMITER //
CREATE PROCEDURE wh_report_stock_xlsx()
BEGIN
  SELECT i.nr, i.vendor, i.name, i.itemNo, g.name AS grp, i.stock, i.minQty,
         -SUM(IF(d.dt >= CURDATE() - INTERVAL 3 MONTH, di.qty, 0)) AS spent3m,
         -SUM(IF(d.dt >= CURDATE() - INTERVAL 6 MONTH, di.qty, 0)) AS spent6m
    FROM wh_v_item i
    LEFT OUTER JOIN wh_grp g ON g.id = i.idgrp
    LEFT OUTER JOIN wh_doc_item di ON di.iditem = i.id AND di.qty < 0
    LEFT OUTER JOIN wh_doc d ON d.id = di.iddoc
   GROUP BY i.id
   ORDER BY 2, 3, 4;
END//
DELIMITER ;


-- wh_report_values.sql
DROP PROCEDURE IF EXISTS wh_report_values;
DELIMITER //
CREATE PROCEDURE wh_report_values(IN p_table VARCHAR(64), IN p_field VARCHAR(64))
BEGIN
  IF p_table = 'wh_doc' AND p_field IN ('grp', 'name') THEN
    SET @sql = CONCAT('SELECT DISTINCT ', p_field, ' AS value FROM wh_doc WHERE ', p_field, ' <> '''' ORDER BY 1');
  ELSEIF p_table = 'worker' AND p_field IN ('grp', 'name', 'nr') THEN
    SET @sql = CONCAT('SELECT DISTINCT ', p_field, ' AS value FROM worker WHERE ', p_field, ' <> '''' ORDER BY 1');
  ELSEIF p_table IN ('wh_item', 'wh_v_item') AND p_field IN ('grp', 'name', 'nr', 'itemNo', 'vendor') THEN
    SET @sql = CONCAT('SELECT DISTINCT ', p_field, ' AS value FROM ', p_table, ' WHERE ', p_field, ' <> '''' ORDER BY 1');
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported report value source';
  END IF;
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END//
DELIMITER ;


-- worker_card.sql
DROP PROCEDURE IF EXISTS worker_card;
DELIMITER //
CREATE PROCEDURE worker_card(IN p_id INT)
BEGIN
  SELECT w.nr, w.name, w.idgrp, g.name AS groupName, i.img
    FROM worker w
    LEFT OUTER JOIN worker_grp g ON g.id = w.idgrp
    LEFT OUTER JOIN worker_img i ON i.idworker = w.id
   WHERE w.id = p_id;
END//
DELIMITER ;


-- worker_group_delete.sql
DROP PROCEDURE IF EXISTS worker_group_delete;
DELIMITER //
CREATE PROCEDURE worker_group_delete(IN p_id INT)
BEGIN
  IF EXISTS (SELECT 1 FROM worker WHERE idgrp = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete non-empty group';
  END IF;

  IF EXISTS (SELECT 1 FROM worker_grp WHERE parent_idgrp = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete group with subgroups';
  END IF;

  DELETE FROM worker_grp WHERE id = p_id;
  SELECT 'Ok' AS Result;
END//
DELIMITER ;


-- worker_group_get.sql
DROP PROCEDURE IF EXISTS worker_group_get;
DELIMITER //
CREATE PROCEDURE worker_group_get(IN p_id INT)
BEGIN
  SELECT id, name, parent_idgrp FROM worker_grp WHERE id = p_id;
END//
DELIMITER ;


-- worker_group_get_or_create.sql
DROP PROCEDURE IF EXISTS worker_group_get_or_create;
DELIMITER //
CREATE PROCEDURE worker_group_get_or_create(IN p_name VARCHAR(255), IN p_parent_idgrp INT)
BEGIN
  DECLARE v_id INT;
  SELECT id INTO v_id
    FROM worker_grp
   WHERE UPPER(TRIM(name)) = UPPER(TRIM(p_name))
     AND IFNULL(parent_idgrp, 0) = IFNULL(p_parent_idgrp, 0)
   LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO worker_grp (name, parent_idgrp) VALUES (TRIM(p_name), p_parent_idgrp);
    SET v_id = LAST_INSERT_ID();
    SELECT id, name, parent_idgrp, TRUE AS created FROM worker_grp WHERE id = v_id;
  ELSE
    SELECT id, name, parent_idgrp, FALSE AS created FROM worker_grp WHERE id = v_id;
  END IF;
END//
DELIMITER ;


-- worker_group_list.sql
DROP PROCEDURE IF EXISTS worker_group_list;
DELIMITER //
CREATE PROCEDURE worker_group_list()
BEGIN
  SELECT id, name, parent_idgrp FROM worker_grp WHERE name IS NOT NULL AND TRIM(name) <> '' ORDER BY name;
END//
DELIMITER ;


-- worker_group_rename.sql
DROP PROCEDURE IF EXISTS worker_group_rename;
DELIMITER //
CREATE PROCEDURE worker_group_rename(IN p_id INT, IN p_name VARCHAR(255))
BEGIN
  IF EXISTS (
    SELECT 1
      FROM worker_grp g
      JOIN worker_grp cur ON cur.id = p_id
     WHERE UPPER(TRIM(g.name)) = UPPER(TRIM(p_name))
       AND IFNULL(g.parent_idgrp, 0) = IFNULL(cur.parent_idgrp, 0)
       AND g.id <> p_id
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group already exists';
  END IF;
  UPDATE worker_grp SET name = TRIM(p_name) WHERE id = p_id;
  SELECT id, name, parent_idgrp FROM worker_grp WHERE id = p_id;
END//
DELIMITER ;


-- worker_info.sql
DROP PROCEDURE IF EXISTS worker_info;
DELIMITER //
CREATE PROCEDURE worker_info(IN p_id INT)
BEGIN
  SELECT w.id, w.nr, w.name, w.idgrp, g.name AS groupName, i.img
    FROM worker w
    LEFT OUTER JOIN worker_grp g ON g.id = w.idgrp
    LEFT OUTER JOIN worker_img i ON i.idworker = w.id
   WHERE w.id = p_id;
END//
DELIMITER ;


-- worker_tree_counts.sql
DROP PROCEDURE IF EXISTS worker_tree_counts;
DELIMITER //
CREATE PROCEDURE worker_tree_counts(IN p_nr VARCHAR(255), IN p_name VARCHAR(255))
BEGIN
  SELECT g.id AS idgrp,
         (SELECT COUNT(*) FROM worker w
           WHERE w.idgrp = g.id
             AND (p_nr IS NULL OR UPPER(w.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
             AND (p_name IS NULL OR UPPER(w.name) LIKE CONCAT('%', UPPER(p_name), '%'))) AS cnt,
         (SELECT COUNT(*) FROM worker_grp c WHERE c.parent_idgrp = g.id) AS childCount
    FROM worker_grp g
  UNION ALL
  SELECT 0 AS idgrp,
         (SELECT COUNT(*) FROM worker w
           WHERE w.idgrp IS NULL
             AND (p_nr IS NULL OR UPPER(w.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
             AND (p_name IS NULL OR UPPER(w.name) LIKE CONCAT('%', UPPER(p_name), '%'))) AS cnt,
         0 AS childCount;
END//
DELIMITER ;


-- worker_tree_groups.sql
DROP PROCEDURE IF EXISTS worker_tree_groups;
DELIMITER //
CREATE PROCEDURE worker_tree_groups(IN p_parent_idgrp INT)
BEGIN
  SELECT id, name, parent_idgrp
    FROM worker_grp
   WHERE (p_parent_idgrp IS NULL AND IFNULL(parent_idgrp, 0) = 0)
      OR (p_parent_idgrp IS NOT NULL AND parent_idgrp = p_parent_idgrp)
   ORDER BY name;
END//
DELIMITER ;


-- worker_tree_workers.sql
DROP PROCEDURE IF EXISTS worker_tree_workers;
DELIMITER //
CREATE PROCEDURE worker_tree_workers(IN p_nr VARCHAR(255), IN p_name VARCHAR(255), IN p_group INT)
BEGIN
  SELECT w.id, w.nr, w.name, w.idgrp, g.name AS groupName
    FROM worker w
    LEFT OUTER JOIN worker_grp g ON g.id = w.idgrp
   WHERE (p_nr IS NULL OR UPPER(w.nr) LIKE CONCAT('%', UPPER(p_nr), '%'))
     AND (p_name IS NULL OR UPPER(w.name) LIKE CONCAT('%', UPPER(p_name), '%'))
     AND (p_group IS NULL OR (p_group = 0 AND w.idgrp IS NULL) OR (p_group > 0 AND w.idgrp = p_group) OR p_group = -1 AND 1 = 0)
   ORDER BY 0 + w.nr, w.name;
END//
DELIMITER ;
