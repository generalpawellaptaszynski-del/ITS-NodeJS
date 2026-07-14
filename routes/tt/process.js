var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router = express.Router();
var db = mysql.createConnection(db_parameters);

function likePattern(value) {
  return "%" + String(value || "").trim().replace(/[\\%_]/g, "\\$&") + "%";
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

router.get('/steps', function(req, res, next){
  db.query('CALL tt_process_steps()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get(['', '/:idgrp(\\d+)'], function(req, res, next){
  var processFilter = req.query.process_name || "";
  db.query('CALL tt_process_tree(?, ?)',
    [req.params.idgrp || null, hasText(processFilter) ? processFilter : null],
    function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.post('', function(req, res, next) {
  let input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_process_insert_group(?, ?)', [input.nr, input.name || ""], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows));
  });
});

router.post('/:idstep_grp(\\d+)/:idstep(\\d+)/:n(\\d+)', function(req, res, next) {
  db.query('CALL tt_process_upsert(?, ?, ?)', [req.params.idstep_grp, req.params.idstep, req.params.n], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows));
  });
});


router.put('/:id(\\d+)', function(req, res, next) {
  var id = req.params.id;
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_process_update_group(?, ?, ?)',
           [id, input.nr, input.name], 
           function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows));
  });
});

router.put('/:idstep_grp(\\d+)/:idstep(\\d+)/:n(\\d+)', function(req, res, next) {
  db.query('CALL tt_process_update(?, ?, ?)', [req.params.idstep_grp, req.params.idstep, req.params.n], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify(rows));
  });
});

router.delete(['/:idstep_grp(\\d+)', 
               '/:idstep_grp(\\d+)/:idstep(\\d+)'], function(req, res, next) {
  db.query('CALL tt_process_delete(?, ?)', [req.params.idstep_grp, req.params.idstep || null], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows));
  });
});

module.exports = router;
