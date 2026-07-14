var express   = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql         = require('mysql'),
    jade          = require('jade'),
    path          = require('path');

var router = express.Router();
var db = mysql.createConnection(db_parameters);
var unidecode = require('unidecode');
var codes = require('rescode');

var views   = [
  'wh-item',  
  'wh-order',  
  'wh-rpt-detailed', 
  'wh-tree-item'
];

/* GET pages. */
views.forEach(function(view) {
  router.get('/' + view, function(req, res) { 
    res.render(view);
  });
}); 

/* Routers: */
router.get('/doc/:barcode', function(req, res, next){
  var barcode = req.params.barcode.toUpperCase();
  if (barcode[0] === 'W')
    barcode = barcode.substring(1) ;
  db.query('CALL wh_doc_scan(?, ?)', [barcode, req.query.action || ""], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else if (!rows[0].length) 
      res.sendStatus(401);  // Unathorised
    else {
      rows[1].forEach(function (val, i) {
        rows[1][i]["img"] = (rows[1][i]["img"] ? new Buffer(rows[1][i]["img"]).toString() : "");
      });
      res.status(200).send(unidecode(JSON.stringify({worker: rows[0][0], items: rows[1]})));
    };   
  });
});

/* Full info about the item */
router.get('/item_info/:id(\\d+$)', function(req, res, next){
  let id = req.params.id;
  db.query('CALL wh_item_info(?)', [id], function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    } else if (!rows.length) {
      res.render('inf-item', {Result: 'ERROR', Message: "Item id=" + id + " not found."});
    } else {
        
      codes.loadModules(["code39"], {includetext:true});
      var barcode = "<img class='barcode' alt='" + rows[0]["nr"] + "' src='data:image/png;base64," + codes.create("code39", rows[0]["nr"]).toString("base64") + "' />";
        
      var result = {
          Message : '',
          barcode : barcode,
          nr : rows[0].nr,
          name : rows[0].name,
          img: 'http://' +req.headers.host+'/images/wh_item/'+id+'.jpg'
        }; //console.log(result);
      
      // Text of the document
      let template = path.join(__dirname, '../../views/wh/wh-inf-item.jade');
      let html = jade.renderFile(template, result);  //console.log(html);
      
      // Render into HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    };  
  });
});

router.post('/doc', function(req, res, next){
  //console.log(req.parms);
  //console.log(req.query);
  //console.log(req.body);
  var barcode     = req.body.barcode;
  var action      = req.body.action;
  var description = req.body.description;

  var items = [];    

  for (var key in req.body) { 
    if (key.startsWith("qty_")) {
      var storage = key.substr(4);
      var val = req.body[key];
      items.push({ storage: storage, qty: val });
    }
  }

  res.setHeader('Content-Type', 'application/json');

  if (items.length == 0)
    res.status(200).send(unidecode(JSON.stringify({Result: 'Empty document'})));    
  else 
    db.query('CALL wh_doc_post(?, ?, ?, ?)', [barcode, action, description, JSON.stringify(items)], function(err, result) {
      if(err) 
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
      else
        res.status(200).send(unidecode(JSON.stringify({Result: 'Ok'})));    
    });    
});

module.exports = router;
