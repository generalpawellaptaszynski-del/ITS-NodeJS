var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router = express.Router();
var db = mysql.createConnection(db_parameters);

function sendJson(res, err, rows, mapper) {
  res.setHeader('Content-Type', 'application/json');

  if (err) {
    res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    return;
  }

  res.status(200).send(JSON.stringify(mapper ? mapper(rows) : rows));
}

function firstResultSet(rows) {
  return Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : [];
}

function firstRow(rows) {
  var resultSet = firstResultSet(rows);
  return resultSet.length > 0 ? resultSet[0] : null;
}

function intOrNull(value) {
  return value != null && value !== '' && !isNaN(value) ? Number(value) : null;
}

function stringOrNull(value) {
  var result = String(value == null ? '' : value).trim();
  return result.length > 0 ? result : null;
}

/* Routers: */
router.get('/', function(req, res, next){
  db.query('CALL tt_map_list()', function(err, rows, fields){
    sendJson(res, err, rows, firstResultSet);
  });
});

router.get('/table', function(req, res, next){
  let input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query(
    'CALL tt_map_table(?, ?, ?, ?, ?)',
    [
      stringOrNull(input.id),
      stringOrNull(input.name),
      intOrNull(input.idstep),
      stringOrNull(input.nrworkers),
      intOrNull(input.hu)
    ],
    function(err, rows, fields){
      sendJson(res, err, rows, firstResultSet);
    }
  );
});

/* Get the list of steps for select */
router.get('/steps', function(req, res, next){
  db.query('CALL tt_map_steps()', function(err, rows, fields){
    sendJson(res, err, rows, firstResultSet);
  });
});

/* Change the name or a step of the place */
router.put('/', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_map_update_place(?, ?, ?)',
           [intOrNull(input.id), stringOrNull(input.name), intOrNull(input.idstep)],
           function(err, rows, fields){
    sendJson(res, err, rows, firstRow);
  });
});

/* Connect or move */
router.put('/:id(\\d+$)', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_map_move_place(?, ?, ?)',
           [intOrNull(req.params.id), input.mapX, input.mapY],
           function(err, rows, fields){
    sendJson(res, err, rows, function () { return {Result: 'Ok'}; });
  });
});

/* Set a source for a team job */
router.put('/team/:id/:idsource(\\d+$)', function(req, res, next) {
  db.query('CALL tt_map_set_team_source(?, ?)',
           [intOrNull(req.params.id), intOrNull(req.params.idsource)],
           function(err, rows, fields){
    sendJson(res, err, rows, function () { return {Result: 'Ok'}; });
  });
});

/* Delete the place */
router.delete('/', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_map_delete_place(?)', [intOrNull(input.id)], function(err, rows, fields){
    sendJson(res, err, rows, function () { return firstRow(rows) || {}; });
  });
});

/* Disconnect */
router.delete('/:id(\\d+$)', function(req, res, next) {
  db.query('CALL tt_map_disconnect_place(?)', [intOrNull(req.params.id)],
    function(err, rows, fields){
      sendJson(res, err, rows, function () { return {Result: 'Ok'}; });
  });
});

/* Set as alone */
router.delete('/team/:id(\\d+$)', function(req, res, next) {
  db.query('CALL tt_map_set_team_alone(?)', [intOrNull(req.params.id)],
    function(err, rows, fields){
      sendJson(res, err, rows, function () { return {Result: 'Ok'}; });
  });
});

module.exports = router;
