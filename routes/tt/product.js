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

function buildGroupFilterClause(alias, term, params) {
  if (!hasText(term)) {
    return "";
  }

  params.push(likePattern(term), likePattern(term));
  return "(" + alias + ".nr LIKE ? OR " + alias + ".name LIKE ?)";
}

function buildProductFilterClause(alias, term, params) {
  if (!hasText(term)) {
    return "";
  }

  params.push(likePattern(term), likePattern(term));
  return "(" + alias + ".nr LIKE ? OR " + alias + ".name LIKE ?)";
}

/* Tree: product | step */
router.get(['',
            '/:idgrp(\\d+)',
            '/:idgrp(\\d+)/:idsgrp(\\d+)'], function(req, res, next) {
  var productFilter = req.query.product_name || "";
  db.query(
    'CALL tt_product_tree(?, ?, ?)',
    [req.params.idgrp || null, req.params.idsgrp || null, hasText(productFilter) ? productFilter : null],
    function(err, rows, fields) {
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.post(['/_',
             '/:idgrp(\\d+)/_',
             '/:idgrp(\\d+)/:idsgrp(\\d+)/_'], function(req, res, next) {
  let input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL tt_product_insert(?, ?, ?, ?)',
    [req.params.idgrp || null, req.params.idsgrp || null, input.nr, input.name],
    function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows));
  });
});

router.put(['/:idgrp(\\d+)',
            '/:idgrp(\\d+)/:idsgrp(\\d+)',
            '/:idgrp(\\d+)/:idsgrp(\\d+)/:id(\\d+)'], function(req, res, next) {
  var id = req.params.idgrp;
  if (req.params.id)
    id = req.params.id;
  else if (req.params.idsgrp)
    id = req.params.idsgrp;

  var input = JSON.parse(JSON.stringify(req.body));

  db.query('CALL tt_product_update(?, ?, ?, ?, ?)',
           [req.params.idgrp || null, req.params.idsgrp || null, req.params.id || null, input.nr, input.name],
           function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else {
       var item = rows[0][0];
      res.status(200).send(JSON.stringify(item)); // +  rows[0].insertId
    };
  });
});

router.delete(['/:idgrp(\\d+)', 
               '/:idgrp(\\d+)/:idsgrp(\\d+)',
               '/:idgrp(\\d+)/:idsgrp(\\d+)/:id(\\d+)'], function(req, res, next){
  db.query('CALL tt_product_delete(?, ?, ?)',
    [req.params.idgrp || null, req.params.idsgrp || null, req.params.id || null],
    function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows));
  });
});

module.exports = router;
