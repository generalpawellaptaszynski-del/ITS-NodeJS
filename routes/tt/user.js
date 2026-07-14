var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router  = express.Router();
var db = mysql.createConnection(db_parameters);
var unidecode = require('unidecode');

/* Routers: */
/* Worker personal info */
router.get('/:tag', function(req, res, next){
  let tag = req.params.tag.substring(0, 8).toUpperCase();
  db.query('CALL tt_user_by_tag(?)', [tag], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else if (rows.length === 0) 
      res.sendStatus(401);  // Unathorised
    else {
      rows[0]["img"] = (rows[0]["img"] ? new Buffer(rows[0]["img"]).toString() : "");
      res.status(200).send(unidecode(JSON.stringify(rows)));
    }  
  });
});

module.exports = router;
