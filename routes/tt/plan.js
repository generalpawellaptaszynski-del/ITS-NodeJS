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

router.get('/processes', function(req, res, next){
  db.query('CALL tt_plan_processes()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get(['', '/:idproduct_grp(\\d+)'], function(req, res, next){
  var planFilter = req.query.plan_name || "";
  db.query('CALL tt_plan_tree(?, ?)',
    [req.params.idproduct_grp || null, hasText(planFilter) ? planFilter : null],
    function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.post('/:idproduct_grp(\\d+)/:idstep_grp(\\d+)/:qty(\\d+)', function(req, res, next) {
  db.query('CALL tt_plan_upsert(?, ?, ?)', [req.params.idproduct_grp, req.params.idstep_grp, req.params.qty], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows));
  });
});

router.put('/:idproduct_grp(\\d+)/:idstep_grp(\\d+)/:qty(\\d+)', function(req, res, next) {
  db.query('CALL tt_plan_update(?, ?, ?)', [req.params.idproduct_grp, req.params.idstep_grp, req.params.qty], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify(rows));
  });
});

router.delete('/:idproduct_grp(\\d+)/:idstep_grp(\\d+)', function(req, res, next) {
  db.query('CALL tt_plan_delete(?, ?)', [req.params.idproduct_grp, req.params.idstep_grp], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows));
  });
});

module.exports = router;
