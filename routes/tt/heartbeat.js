var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router  = express.Router();
var db = mysql.createConnection(db_parameters);
var unidecode = require('unidecode');

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(payload));
}

function isDebugRequest(req) {
  return req.query && (req.query.debug === '1' || req.query.debug === 'true');
}

function logSql(sql) {
  console.log('[tt/heartbeat] SQL:', sql);
}

function parseDeviceId(value) {
  var devid = Number(value);
  return Number.isInteger(devid) && devid > 0 ? devid : null;
}

function parseTags(value) {
  value = String(value == null ? '' : value).trim();

  if (value === '[]') {
    return '';
  }

  if (value.length < 2 || value[0] !== '[' || value[value.length - 1] !== ']') {
    return null;
  }

  return value.substring(1, value.length - 1).toUpperCase();
}

function heartbeat(req, res) {
  var devid = parseDeviceId(req.params.devid);
  if (!devid) {
    return sendJson(res, 400, {Result: 'ERROR', Message: 'Wrong device id'});
  }

  var sql = mysql.format('CALL tt_heartbeat(?)', [devid]);
  logSql(sql);

  db.query(sql, function(err, rows, fields){
    if (err) {
      return sendJson(res, 500, {Result: 'ERROR', Message: JSON.stringify(err), SQL: isDebugRequest(req) ? sql : undefined});
    }

    if (isDebugRequest(req)) {
      return sendJson(res, 200, {Result: 'Ok', SQL: sql});
    }

    sendJson(res, 200, {Result: 'Ok'});
  });
}

function heartbeatChanged(req, res) {
  var devid = parseDeviceId(req.params.devid);
  if (!devid) {
    return sendJson(res, 400, {Result: 'ERROR', Message: 'Wrong device id'});
  }

  var tags = parseTags(req.params.tags);
  if (tags === null) {
    return sendJson(res, 400, {Result: 'ERROR', Message: 'Wrong tag list'});
  }

  var sql = mysql.format('CALL tt_heartbeatChanged(?, ?)', [devid, tags]);
  logSql(sql);

  db.query(sql, function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err), SQL: isDebugRequest(req) ? sql : undefined}));
    } else if (isDebugRequest(req)) {
      res.status(200).send(unidecode(JSON.stringify({Result: 'Ok', SQL: sql, Rows: rows})));
    } else {
      res.status(200).send(unidecode(JSON.stringify(rows)));
      //res.status(200).send(JSON.stringify(rows));
    }
  });
}

/* Routers: */
router.post('/:devid', heartbeat);
router.get('/:devid', heartbeat);
router.post('/:devid/:tags', heartbeatChanged);
router.get('/:devid/:tags', heartbeatChanged);

module.exports = router;
