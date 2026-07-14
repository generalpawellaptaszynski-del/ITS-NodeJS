var express       = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql         = require('mysql'),
    jade          = require('jade'),
    path          = require('path'),
    Excel         = require('exceljs');


var router        = express.Router();
var db = mysql.createConnection(db_parameters);
//var unidecode = require('unidecode');

var views   = [
  'ta-event'       
];

/* GET pages. */
views.forEach(function(view) {
  router.get('/' + view, function(req, res) { 
    res.render(view);
  });
}); 

router.get('/in/:devid/:tag', function(req, res, next) {
  // Allowed only if there is no active incoming or for the employee with an unlimited access
  db.query("CALL ta_In(?,?)", [req.params.devid, req.params.tag], function(err, rows, fields){
	console.log(rows);  
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({'error': true, 'message':  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows));
  });
});

router.get('/out/:devid/:tag', function(req, res, next) {
  // Allowed only if there is an active incoming or for the employee with an unlimited access
  db.query("CALL ta_Out(?,?)", [req.params.devid, req.params.tag], function(err, rows, fields){
	console.log(rows);  
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({'error': true, 'message':  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows));
  });
});

router.get('/event/periods', function(req, res, next){
  db.query('CALL ta_event_periods()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/event/workers', function(req, res, next){
  db.query('CALL ta_event_workers()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else   
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/event/tree/:period(\\d+)/:filterWorker(\\d+)', function(req, res, next){
  var filterWorker = parseInt(req.params.filterWorker, 10) || 0;
  db.query('CALL ta_event_tree_workers(?, ?)', [req.params.period, filterWorker], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/event/tree/:period(\\d+)/:filterWorker(\\d+)/:workerKey([^/]+)', function(req, res, next){
  var workerId = parseInt(String(req.params.workerKey).replace(/^w/, ''), 10) || 0;
  db.query('CALL ta_event_tree_days(?, ?)', [req.params.period, workerId], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/event/tree/:period(\\d+)/:filterWorker(\\d+)/:workerKey([^/]+)/:dayKey([^/]+)', function(req, res, next){
  var workerId = parseInt(String(req.params.workerKey).replace(/^w/, ''), 10) || 0;
  var day = String(req.params.dayKey).replace(/^d/, '');
  db.query('CALL ta_event_tree_events(?, ?, ?)', [req.params.period, workerId, day], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/event/:period(\\d+)/:idworker(\\d+)', function(req, res, next){
  var workerId = parseInt(req.params.idworker, 10) || 0;
  if (!workerId) {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify([]));
    return;
  }

  db.query('CALL ta_event_worker_events(?, ?)', [req.params.period, workerId], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Set parameters for an Excel workbook */
function setWorkbookParameters(wb) {
  wb.creator = 'ITS';
  wb.lastModifiedBy = 'ITS';
  wb.created = new Date();
  wb.modified = new Date();
  wb.lastPrinted = new Date();
  wb.properties.date1904 = true;
  wb.views = [
    {
      x: 0, y: 0, width: 10000, height: 20000,
      firstSheet: 0, activeTab: 1, visibility: 'visible'
    }
  ];
};

router.get('/xls/:period(\\d+$)', function(req, res, next){
  db.query('CALL ta_event_xls(?)', [req.params.period], function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) { 
      res.setHeader('Content-Type', 'application/json'); 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    };
      
    // Create XLSX-file
    var wb = new Excel.Workbook({useStyles: true});
    setWorkbookParameters(wb);
    var ws = wb.addWorksheet('Timesheet_' + req.params.period,
      {pageSetup:{paperSize: 9, orientation:'landscape', fitToPage: true, fitToHeight: 100, fitToWidth: 2}}); // A4 landscape
    ws.pageSetup.margins = {
      left: 0.7, right: 0.7,
      top: 0.75, bottom: 0.75,
      header: 0.3, footer: 0.3
    };
    ws.pageSetup.printTitlesRow = '1:1';
    ws.pageSetup.printTitlesColumn = 'A:B';
    ws.properties.defaultRowHeight = 18;
    ws.columns = [
      {header: 'Nr',   key: 'nr',   width: 8},
      {header: 'Name', key: 'name', width: 30},
      {header: '@',    key: 'symbol', width: 2},
      {header: '01',   key: 'd01',  width: 6},
      {header: '02',   key: 'd02',  width: 6},
      {header: '03',   key: 'd03',  width: 6},
      {header: '04',   key: 'd04',  width: 6},
      {header: '05',   key: 'd05',  width: 6},
      {header: '06',   key: 'd06',  width: 6},
      {header: '07',   key: 'd07',  width: 6},
      {header: '08',   key: 'd08',  width: 6},
      {header: '09',   key: 'd09',  width: 6},
      {header: '10',   key: 'd10',  width: 6},
      {header: '11',   key: 'd11',  width: 6},
      {header: '12',   key: 'd12',  width: 6},
      {header: '13',   key: 'd13',  width: 6},
      {header: '14',   key: 'd14',  width: 6},
      {header: '15',   key: 'd15',  width: 6},
      {header: '16',   key: 'd16',  width: 6},
      {header: '17',   key: 'd17',  width: 6},
      {header: '18',   key: 'd18',  width: 6},
      {header: '19',   key: 'd19',  width: 6},
      {header: '20',   key: 'd20',  width: 6},
      {header: '21',   key: 'd21',  width: 6},
      {header: '22',   key: 'd22',  width: 6},
      {header: '23',   key: 'd23',  width: 6},
      {header: '24',   key: 'd24',  width: 6},
      {header: '25',   key: 'd25',  width: 6},
      {header: '26',   key: 'd26',  width: 6},
      {header: '27',   key: 'd27',  width: 6},
      {header: '28',   key: 'd28',  width: 6},
      {header: '29',   key: 'd29',  width: 6},
      {header: '30',   key: 'd30',  width: 6},
      {header: '31',   key: 'd31',  width: 6}
    ];
      
    // Fill the table
    var idworker = 0,
        worker_i = {}, // In
        worker_w = {}, // Work
        worker_r = {}, // Rest/Pause
        worker_o = {}, // Out                       
        worker_template = {
          'nr' : "", 'name': "", 'symbol': "",
          'd01': "", 'd02': "", 'd03': "", 'd04': "", 'd05': "", 'd06': "", 'd07': "", 'd08': "", 'd09': "", 'd10': "",
          'd11': "", 'd12': "", 'd13': "", 'd14': "", 'd15': "", 'd16': "", 'd17': "", 'd18': "", 'd19': "", 'd20': "",
          'd21': "", 'd22': "", 'd23': "", 'd24': "", 'd25': "", 'd26': "", 'd27': "", 'd28': "", 'd29': "", 'd30': "",
          'd31': ""};
    rows.forEach(e => { 
      if (idworker != e.idworker) {
        if (idworker != 0) {
          ws.addRow(worker_i);
          ws.addRow(worker_w);
          ws.addRow(worker_r);
          ws.addRow(worker_o);
        };
        worker_i = Object.assign({}, worker_template);
        worker_w = Object.assign({}, worker_template);
        worker_r = Object.assign({}, worker_template);
        worker_o = Object.assign({}, worker_template);
        worker_i['symbol'] = '»';
        worker_w['symbol'] = 'P';
        worker_r['symbol'] = 'C';
        worker_o['symbol'] = '«';
        worker_i['nr'] = e.nr;
        worker_i['name'] = e.name;
        idworker = e.idworker;
      };    
      worker_i["d" + e.day] = e.t_min;
      worker_w["d" + e.day] = e.t_work;
      worker_r["d" + e.day] = e.t_rest;
      worker_o["d" + e.day] = e.t_max;
    });   
    if (idworker != 0) {
      ws.addRow(worker_i);
      ws.addRow(worker_w);
      ws.addRow(worker_r);
      ws.addRow(worker_o);
    };    

    // Merge cells, format lines
    ws.eachRow({ includeEmpty: true }, function(row, rowNum) {
      if (rowNum > 1 && rowNum % 4 == 1) {
        ws.mergeCells(rowNum - 3, 1, rowNum, 1);
        ws.mergeCells(rowNum - 3, 2, rowNum, 2);
      };
      row.eachCell(function (cell, colNum) {
        if (colNum <= 2) 
          cell.alignment = {vertical: 'middle', horizontal: 'left'};
        else {
          cell.alignment = {vertical: 'middle', horizontal: 'center'};
          if (rowNum > 1)
            switch(rowNum % 4) {
              case 0:
                row.getCell(colNum).font = {color: {argb: "FF800080"}}; //"FF808080"
                break;
              case 1: 
              case 2:
                row.getCell(colNum).font = {color: {argb: "FF404040"}};
                break;
              case 3:
                row.getCell(colNum).font = {color: {argb: "FF0000FF"}}; //"FF808080"
                break;
            }; 
        };  
      })
    });

    // Complete the document
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=TimeAttendance_" + req.params.period + ".xlsx");
    wb.xlsx.write(res)
      .then(function (data) {
        res.end();
        console.log('File write done........');
      });
  });
});

router.post('/event/:period(\\d+)/:idworker(\\d+)', function(req, res, next) {
  let idworker = req.params.idworker;
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL ta_event_insert(?, ?, ?)', [idworker, input.dt, input.duration], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) {
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    } else {
      res.status(200).send(JSON.stringify(rows[0][0]));
    }
  });
});

router.put('/event/:period(\\d+)/:idworker(\\d+)', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  var oldDt = input.oldDt || input.dt;
  db.query('CALL ta_event_update(?, ?, ?, ?)', [req.params.idworker, oldDt, input.dt, input.duration], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err)
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify(rows));
  });
});

router.delete('/event', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL ta_event_delete(?, ?)', [input.idworker, input.dt], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify(rows));
  });
});

module.exports = router;
