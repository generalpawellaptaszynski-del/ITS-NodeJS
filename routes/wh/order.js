var express   = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql         = require('mysql');
var router = express.Router();
var db = mysql.createConnection(db_parameters);

/* Routers: */
router.get('/workers', function(req, res, next){
  db.query('CALL wh_order_workers()', function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.get('/:idworker(\\d+$)', function(req, res, next) {
  db.query('CALL wh_order_list(?)', [req.params.idworker], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else
       res.status(200).send(JSON.stringify(rows[0]));
  });
});

router.post('/:idworker(\\d+$)', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body));
  db.query('CALL wh_order_insert(?, ?, ?, ?)', [req.params.idworker, input.iditem, input.qty, input.dtarget], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else 
      res.status(200).send(JSON.stringify({Result: 'OK'}));
  });
});

router.delete('/:idworker(\\d+$)', function(req, res, next) {
  db.query('CALL wh_order_delete(?, ?)', [req.params.idworker, req.body.iditem], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else {
       if (req.params.dictionary === 'worker') {
          /* Delete the image */
          var file = imgPath + req.params.dictionary +'/' + req.body.id + '.jpg';
          fs.unlink(file, function(err) {
          if(err && err.code =='ENOENT') 
            console.info('File "' + file + '" does not exist.');
          else if(err)  
            console.error('ERROR while deleting the file "' + file +'"');
          else
            console.info('File "' + file + '" has been deleted.');  
          });
       };
      res.status(200).send(JSON.stringify(rows));
    };
  });
});

module.exports = router;
