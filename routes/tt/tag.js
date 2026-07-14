var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router  = express.Router();
var db = mysql.createConnection(db_parameters);

function sendTagResult(res, err, rows) {
  res.setHeader('Content-Type', 'application/json');
  if (err) {
    return res.status(500).send(JSON.stringify({Result: 'ERROR', message: JSON.stringify(err)}));
  }

  if (rows && rows.affectedRows) {
    return res.status(200).send(JSON.stringify({Result: 'Ok'}));
  }

  res.status(400).send(JSON.stringify({Result: 'ERROR', message: 'Wrong RFID or Barcode'}));
}

/* Routers: */
router.post('/:tag/:data', function(req, res, next) {
  console.log(req.params);
  var tag = req.params.tag.substring(0, 8).toUpperCase();

  db.query('CALL tt_tag_apply(?, ?)', [tag, req.params.data], function(err, rows, fields) {
    sendTagResult(res, err, rows);
  });
});

// Added 03.10.2024
router.get('/:deviceID/:tag_user/:tag/:data', function(req, res, next) {
  console.log(req.params);
  var tag = req.params.tag.substring(0, 8).toUpperCase();

  // The tag-writing log can be updated here:
  // ...

  db.query('CALL tt_tag_apply(?, ?)', [tag, req.params.data], function(err, rows, fields) {
    sendTagResult(res, err, rows);
  });
});

router.post('/register/:type/:tag', function(req, res, next) {
  console.log(req.params);
  var allowedTypes = ['worker', 'step', 'hu'];
  var type = req.params.type;
  var tag = req.params.tag.substring(0, 8).toUpperCase();

  if (allowedTypes.indexOf(type) === -1) {
    return res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Wrong tag type'}));
  }

  db.query("CALL tt_tag_register(?, ?)", [type, tag], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
      res.status(200).send(JSON.stringify({Result: 'Ok'}));
  });
});

module.exports = router;
