var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router  = express.Router();
var db = mysql.createConnection(db_parameters);
var unidecode = require('unidecode');

/* Routers: */
router.post( '/:devid', function(req, res, next){
  var devid = Number(req.params.devid);
  if (!Number.isInteger(devid)) {
    return res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Wrong device id'}));
  }

  db.query('CALL tt_heartbeat(?)', [devid], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify({Result: 'Ok'}));
  });
});

//router.get('/:devid/:tags', function(req, res, next){
router.post('/:devid/:tags', function(req, res, next){
  var devid = Number(req.params.devid);
  if (!Number.isInteger(devid)) {
    return res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Wrong device id'}));
  }

  var tags = req.params.tags.toUpperCase().substr(1).slice(0, -1); // Remove the first and the last symbols: []
  db.query('CALL tt_heartbeatChanged(?, ?)', [devid, tags], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else {
      res.status(200).send(unidecode(JSON.stringify(rows)));
      //res.status(200).send(JSON.stringify(rows));
    };  
  });
});

module.exports = router;
