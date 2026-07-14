var express  = require('express'),
    Excel    = require('exceljs'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router = express.Router();
var db = mysql.createConnection(db_parameters);

/* Report Service tree - year level */
router.get('/service', function(req, res, next){
  db.query('CALL tt_report_service_years()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Report Service tree - month level */
router.get('/service/:year', function(req, res, next){
  db.query('CALL tt_report_service_months(?)', [req.params.year], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Report Service tree - day level */
router.get('/service/:year/:month', function(req, res, next){
  db.query('CALL tt_report_service_days(?, ?)', [req.params.year, req.params.month], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Report Service tree - workplace level */
router.get('/service/:year/:month/:day', function(req, res, next){
  db.query('CALL tt_report_service_places(?, ?, ?)', [req.params.year, req.params.month, req.params.day], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Report Service tree - worker level */
router.get('/service/:year/:month/:day/:idplace', function(req, res, next){
  db.query('CALL tt_report_service_workers(?, ?, ?, ?)', [req.params.year, req.params.month, req.params.day, req.params.idplace], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

function intOrNull(value) {
  return value != null && value !== '' && !isNaN(value) ? Number(value) : null;
}

function textOrNull(value) {
  value = String(value == null ? '' : value).trim();
  return value.length ? value : null;
}

function detailedParams(input, date) {
  input = input || {};
  return [
    date || null,
    textOrNull(input.dfrom || (input.d && input.d.dfrom)),
    textOrNull(input.dto || (input.d && input.d.dto)),
    intOrNull(input.idplace),
    intOrNull(input.idstep),
    intOrNull(input.idworker),
    intOrNull(input.idproduct_grp),
    intOrNull(input.hu)
  ];
}

function setWorkbookParameters(workbook) {
  workbook.creator = 'ITS';
  workbook.lastModifiedBy = 'ITS';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  workbook.properties.date1904 = true;
  workbook.views = [{x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 1, visibility: 'visible'}];
};

router.get('/detailed/tree', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query));
  db.query('CALL tt_report_detailed_tree(?, ?, ?, ?, ?, ?, ?, ?)', detailedParams(input, null), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/detailed/tree/:date(\\d{4}-\\d{2}-\\d{2})', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query));
  db.query('CALL tt_report_detailed_tree_rows(?, ?, ?, ?, ?, ?, ?, ?)', detailedParams(input, req.params.date), function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/detailed/xlsx', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query));
  db.query('CALL tt_report_detailed_xlsx(?, ?, ?, ?, ?, ?, ?, ?)', detailedParams(input, null), function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
      return;
    }

    var workbook = new Excel.Workbook();
    setWorkbookParameters(workbook);
    var worksheet = workbook.addWorksheet('Detailed');
    worksheet.columns = [
      { header: 'Date', key: 'd', width: 14 },
      { header: 'Time', key: 't', width: 12 },
      { header: 'Sec', key: 'sec', width: 8 },
      { header: 'Work.Place', key: 'place', width: 20 },
      { header: 'Work.Step', key: 'step', width: 20 },
      { header: 'Worker', key: 'worker', width: 20 },
      { header: 'Product group', key: 'product_grp', width: 20 },
      { header: 'Proc.List', key: 'hu', width: 12 }
    ];
    rows.forEach(function (row) {
      worksheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=TimeTracking-Report.xlsx');
    workbook.xlsx.write(res).then(function () {
      res.end();
    });
  });
});

/* For rpt-detailed */
router.get('/detailed', function(req, res, next){
  var input = JSON.parse(JSON.stringify(req.query /*req.body*/));
  res.setHeader('Content-Type', 'application/json'); 
  db.query('CALL tt_report_detailed(?, ?, ?, ?, ?, ?, ?, ?)', detailedParams(input, null), function(err, rows, fields){
    if (err)
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
        res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Dictionaries for selects in the rpt-detailed */
router.get('/dictionaries', function(req, res, next){
  res.setHeader('Content-Type', 'application/json');
  function queryRows(proc) {
    return new Promise(function(resolve, reject) {
      db.query('CALL ' + proc + '()', function(err, rows, fields) {
        if (err) {
          reject(err);
        } else {
          resolve(rows[0]);
        }
      });
    });
  }

  Promise.all([
    queryRows('tt_report_dict_places'),
    queryRows('tt_report_dict_steps'),
    queryRows('tt_report_dict_workers'),
    queryRows('tt_report_dict_product_groups')
  ]).then(function(rows) {
    res.status(200).send(JSON.stringify(rows));
  }).catch(function(err) {
    res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
  });
});

module.exports = router;
