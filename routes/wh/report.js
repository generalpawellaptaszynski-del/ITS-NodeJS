var express  = require('express'),
    Excel    = require('exceljs'),
    db_parameters = require('../../config/db_parameters'),
    mysql    = require('mysql'),
    Excel    = require('exceljs');
var router = express.Router();
var db = mysql.createConnection(db_parameters);

function filterParams(input, year, month, day, iddoc) {
  input = input || {};
  function text(value) {
    value = String(value == null ? "" : value).trim();
    return value.length ? value : null;
  }
  return [
    year || null,
    month || null,
    day || null,
    iddoc || null,
    text(input.doc_grp),
    text(input.doc_name),
    text(input.worker_grp),
    text(input.worker_name),
    text(input.worker_nr),
    text(input.item_grp),
    text(input.item_name),
    text(input.item_nr),
    text(input.item_itemNo),
    text(input.item_vendor)
  ];
}


/* For Selects */
router.get('/values/:table/:field', function(req, res, next) {
  db.query('CALL wh_report_values(?, ?)', [req.params.table, req.params.field], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree - year level */
/* For the tree - year level */
router.get('/detailed', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query('CALL wh_report_detailed(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', filterParams(input), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree - month level */
router.get('/detailed/:year', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query('CALL wh_report_detailed(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', filterParams(input, req.params.year), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree - day level */
router.get('/detailed/:year/:month', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query('CALL wh_report_detailed(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', filterParams(input, req.params.year, req.params.month), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree - doc level */
router.get('/detailed/:year/:month/:day', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query('CALL wh_report_detailed(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', filterParams(input, req.params.year, req.params.month, req.params.day), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* For the tree - item level */
router.get('/detailed/:year/:month/:day/:iddoc', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  db.query('CALL wh_report_detailed(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', filterParams(input, req.params.year, req.params.month, req.params.day, req.params.iddoc), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Set parameters for an Excel workbook */
function setWorkbookParameters(workbook) {
  workbook.creator = 'ITS';
  workbook.lastModifiedBy = 'ITS';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  workbook.properties.date1904 = true;
  workbook.views = [{x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 1, visibility: 'visible'}];
};

router.get('', function(req, res, next){
  db.query('CALL wh_report_stock_xlsx()', function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) { 
      res.setHeader('Content-Type', 'application/json'); 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    };
    
    // Create XLSX-file
    var workbook = new Excel.Workbook();
    setWorkbookParameters(workbook);
    var worksheet_1 = workbook.addWorksheet('ToOrder');
    var worksheet_2 = workbook.addWorksheet('OnStock');
    arrHead = [
      {header: 'Storage',  key: 'nr',      width: 10},
      {header: 'Vendor',   key: 'vendor',  width: 15},
      {header: 'Name',     key: 'name',    width: 20},
      {header: 'Item Nr',  key: 'itemNo',  width: 15},
      {header: 'Group',    key: 'grp',     width: 15},
      {header: 'On stock', key: 'stock',   width:  8},
      {header: 'Min qty',  key: 'minQty',  width:  8},
      {header: '3 months', key: 'spent3m', width:  8},
      {header: '6 months', key: 'spent6m', width:  8}
    ];
    worksheet_1.columns = arrHead;
    worksheet_2.columns = arrHead;
    
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].stock < rows[i].minQty)
        worksheet_1.addRow(rows[i]);
      worksheet_2.addRow(rows[i]);
    };  

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=Warehouse.xlsx");
    workbook.xlsx.write(res)
      .then(function (data) {
        res.end();
        console.log('File write done...');
      });
  });
});

module.exports = router;
