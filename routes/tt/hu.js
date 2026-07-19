var express = require('express')
    db_parameters = require('../../config/db_parameters'),
    mysql = require('mysql'),
    jade = require('jade'),
    path = require('path');
 
var router = express.Router();
var db = mysql.createConnection(db_parameters);
var codes = require('rescode');
var barcodeCache = Object.create(null);

var dateFormat = "dd-mm-yy";
codes.loadModules(["code39"]);

function getBarcodeImg(hu) {
  var key = String(hu);
  if (!barcodeCache[key]) {
    barcodeCache[key] = "<img class='barcode' alt='" + key + "' src='data:image/png;base64," + codes.create("code39", key).toString("base64") + "' />";
  }

  return barcodeCache[key];
}

/* Full info about the order or HU (HTML-string) */
router.get(['/order/:idorder(\\d+$)', '/:hu(\\d+$)', '/:hu(-\\d+$)'], function(req, res, next){
  db.query('CALL tt_hu_info(?, ?)', [req.params.idorder || null, req.params.hu || null], function(err, rows, fields) {
    var orderRows = rows && rows[0] ? rows[0] : [];
    var huRows = rows && rows[1] ? rows[1] : [];
    var stepRows = rows && rows[2] ? rows[2] : [];
    if (err) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
      return;
    }

    if (!orderRows.length) {
      res.render('tt-inf-order', {Result: 'ERROR', Message: "Not found."});
      return;
    }

        var result = {
          /* Order info */
          order_name       : orderRows[0].o_name,
          order_name2      : orderRows[0].o_name2,
          order_description: orderRows[0].o_description,
          order_date       : orderRows[0].o_d,
          order_dtarget    : orderRows[0].o_dtarget,
          order_qty        : orderRows[0].o_qty ,

          /* Product info */
          product_nr  : orderRows[0].p_nr  ,
          product_name: orderRows[0].p_name,

          /* The list of HU */
          hu_list: {}
        };

        /* HU info */
        for (const [key, value] of Object.entries(huRows))
          result.hu_list[value.hu] = {
            hu_barcode: getBarcodeImg(value.hu),
            hu_qty: value.hu_qty,
            hu_s_nr: value.hu_s_nr,
            hu_s_name: value.hu_s_name,
            hu_steps: {}
          };

        /* HU steps */
        for (const [key, value] of Object.entries(stepRows)) {
          if (!result.hu_list[value.hu].hu_steps.hasOwnProperty(value.step_id))
            result.hu_list[value.hu].hu_steps[value.step_id] = {
              step_id    : value.step_id,
              step_n     : value.step_n,
              step_name  : value.step_name,
              step_events: []
            };

          result.hu_list[value.hu].hu_steps[value.step_id].step_events.push({
            event_dt     : value.event_dt,
            event_duration: value.event_duration,
            event_worker : value.event_worker
          });
        }

        let template = path.join(__dirname, '../../views/tt/tt-inf-order.jade');
        let html = jade.renderFile(template, result);

        res.status(200);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
  });
});

/* For the tree of HUs - years */
router.get('/list/years', function(req, res, next){
  db.query('CALL tt_hu_list_years()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree of HUs - months */
router.get('/list/:y(\\d{4})', function(req, res, next){
  db.query('CALL tt_hu_list_months(?)', [req.params.y], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree of HUs - days */
router.get('/list/:ym(\\d{6})', function(req, res, next){
  db.query('CALL tt_hu_list_days(?)', [req.params.ym], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree of HUs - orders */
router.get('/orders/:ymd(\\d{8})', function(req, res, next){
  db.query('CALL tt_hu_orders(?)', [req.params.ymd], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree of HUs - HUs */
router.get('/proc_lists/:idorder(\\d+$)', function(req, res, next){
  db.query('CALL tt_hu_proc_lists(?)', [req.params.idorder], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.post('/', function(req, res, next) {
  let input = JSON.parse(JSON.stringify(req.body));
  //console.log(input);
  let qty = Number(input.qty);
  let qtyOnList = Number(input.qtyOnList);
  let order2 = String(input.order2 || '');
  let description = String(input.description || '');
  let dtarget = input.dtarget || null;

  res.setHeader('Content-Type', 'application/json');
  if (order2.length > 100) {
    res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Reference/Tax Number must be 100 characters or less.'}));
    return;
  }

  if (description.length > 200) {
    res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Description must be 200 characters or less.'}));
    return;
  }

  if (!qtyOnList || qtyOnList <= 0) {
    qtyOnList = qty;
  }
  qtyOnList = Math.min(qtyOnList, qty);
  db.query('CALL tt_hu_create_order(?, ?, ?, ?, ?, ?, ?, ?)',
    [input.order, order2, description, dtarget, input.idproduct, input.idproduct_grp, qty, qtyOnList],
    function(err, rows) {
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0][0]));
  });
});

router.delete('/:idorder(\\d+$)', function(req, res, next) {
  db.query('CALL tt_hu_delete_order(?)', [req.params.idorder], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify({Result: 'OK'}));
  });
});

module.exports = router;
