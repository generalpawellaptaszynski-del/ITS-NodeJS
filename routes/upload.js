var express   = require('express'),
    db_parameters = require('../config/db_parameters'),
    mysql     = require('mysql'),
    multer    = require('multer'),
//    archiver  = require('archiver'),
    fs        = require('fs'),
    crypto    = require('crypto'),
    password  = 'tt_' + fs.readFileSync('./public/ServiceKey'),
    algorithm = 'aes-256-ctr';
var router = express.Router();
var db = mysql.createConnection(db_parameters);

var storageMap = multer.diskStorage({
    destination: function(req, file, callback){callback(null, './public/images/images-user');},
    filename:    function(req, file, callback){callback(null, 'map.jpg');}
});
var storageKey = multer.diskStorage({
    destination: function(req, file, callback){callback(null, './public');},
    filename:    function(req, file, callback){callback(null, 'ServiceKey');}
});
var storageMemo = multer.memoryStorage();

function encrypt(buffer, password){
  var cipher = crypto.createCipher(algorithm, password)
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
};
 
function decrypt(buffer, password){
  var decipher = crypto.createDecipher(algorithm, password)
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
};

/* Routers: */
router.post('/map', 
  multer({storage: storageMap}).single('filename'), function(req, res, next) {
    res.status(200).send();
});

router.post('/key', 
  multer({storage: storageKey}).single('filename'), function(req, res, next) {
    res.status(200).send();
});

/* Update from file */
router.post('/devices', 
  multer({storage: storageMemo}).single('filename'), function(req, res, next) {
    console.log('Buffer:', req.file.buffer);
    let deviceList = decrypt(req.file.buffer, password).toString();
    if (!deviceList.length) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: 'ERROR: The file is empty.'}));
      return;
    }
    db.query('CALL upload_tt_devices(?)', [deviceList], function(err, rows, fields){
      res.setHeader('Content-Type', 'application/json');
      if (err) 
          res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
      else
         res.status(200).send(JSON.stringify(rows));
    });
});

module.exports = router;
