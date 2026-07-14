var express = require('express'),
    db_parameters = require('../config/db_parameters'),
    multer    = require('multer'),
    mysql   = require('mysql');

var router = express.Router();
var db = mysql.createConnection(db_parameters);

var dictionaries = {
  worker: {
    table: 'worker',
    keyfield: 'idworker',
    imageTable: 'worker_img',
    image: true,
    filters: ['id', 'nr', 'name', 'idgrp'],
    fields: ['id', 'nr', 'name', 'idgrp']
  },
  wh_item: {
    table: 'wh_item',
    keyfield: 'iditem',
    imageTable: 'wh_item_img',
    image: true,
    filters: ['id', 'nr', 'name', 'grp', 'vendor', 'itemNo', 'price', 'minQty'],
    fields: ['id', 'nr', 'name', 'grp', 'vendor', 'itemNo', 'price', 'minQty']
  },
  wh_v_item: {
    table: 'wh_v_item',
    keyfield: 'iditem',
    imageTable: 'wh_item_img',
    image: true,
    filters: ['id', 'nr', 'name', 'grp', 'vendor', 'itemNo', 'price', 'minQty']
  },
  kt_meals: {
    table: 'kt_meals',
    keyfield: 'idmeals',
    imageTable: 'kt_meals_img',
    image: true,
    filters: ['id', 'nr', 'name', 'grp', 'price', 'cash', 'disabled'],
    fields: ['id', 'nr', 'name', 'grp', 'price', 'cash', 'disabled']
  },
  step: {
    table: 'step',
    keyfield: 'idstep',
    image: false,
    filters: ['id', 'nr', 'name'],
    fields: ['id', 'nr', 'name']
  }
};

function getDictionary(res, name, requireWritable) {
  var dictionary = dictionaries[name];
  if (!dictionary || (requireWritable && !dictionary.fields)) {
    res.status(400).json({Result: 'ERROR', Message: 'Unsupported dictionary'});
    return null;
  }

  return dictionary;
}
/*
var storageMemo = multer.memoryStorage(); // to upload an image

var upload = multer({
	  storage: storageMemo,
	  limits: {fileSize: 10 * 1024 * 1024} // 10 MB
	});
*/
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use diskStorage for better handling of large files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Allow up to 20 MB files
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});




/* Routers: */
router.get(["/:dictionary", "/:dictionary/:barcode"], function (req, res, next) {
  var dictionary = getDictionary(res, req.params.dictionary, false);
  if (!dictionary) {
    return;
  }

  var isImage = dictionary.image;
  var barcode = null;
  var id = null;
  var filter = {};
  if (req.params.barcode) {
    barcode = req.params.barcode.toUpperCase();
    if (req.params.dictionary === "worker" && barcode[0] === 'W')
      barcode = barcode.substring(1) ;
  } else if (req.body.id) {
    id = req.body.id;
  } else {
    Object.keys(req.query).forEach(function (key) {
      if (key !== "_" && dictionary.filters.indexOf(key) !== -1 && typeof req.query[key] != 'undefined' && req.query[key].length > 0) {
        filter[key] = req.query[key];
      } else if (req.params.dictionary === "step" && key === "step_name" && typeof req.query[key] != 'undefined' && req.query[key].length > 0) {
        filter.step_name = req.query[key];
      }
    });
  };

  db.query(
    'CALL dictionary_get(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.params.dictionary,
      barcode,
      id,
      filter.id || null,
      filter.nr || null,
      filter.name || null,
      filter.idgrp || null,
      filter.grp || null,
      filter.vendor || null,
      filter.itemNo || null,
      filter.price || null,
      filter.minQty || null,
      filter.step_name || null,
      req.params.barcode || null
    ],
    function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    res.setHeader('Content-Type', 'application/json');
    if (err) 
       res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else if (req.params.barcode && rows.length === 0) 
       res.sendStatus(401);  // Unathorised
    else {
      if (isImage)
        rows.forEach(function (val, i) {
          rows[i]["img"] = (rows[i]["img"] ? new Buffer.from(rows[i]["img"]).toString() : "");
        });
      if (req.params.barcode)
        rows = rows[0];
      res.status(200).send(JSON.stringify(rows));
    }; 
  });
});

/* Insert and Update */
function updHandler(req, res, next) {
  var dictionary = getDictionary(res, req.params.dictionary, true);
  if (!dictionary) {
    return;
  }

  var data = JSON.parse(JSON.stringify(req.body));
  if (req.params.id && !data.id) {
    data.id = req.params.id;
  }
  db.query(
    'CALL dictionary_upsert(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.params.dictionary,
      data.id || null,
      data.nr || null,
      data.name || null,
      data.idgrp || null,
      data.grp || null,
      data.vendor || null,
      data.itemNo || null,
      data.price || null,
      data.minQty || null,
      data.cash || null,
      data.disabled || null
    ],
    function(err, rows, fields){
    if (err) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    } else {
      if (req.body.img && dictionary.image) {
        db.query('CALL dictionary_update_img(?, ?, ?)', [req.params.dictionary, req.body.nr, req.body.img], function(errImg) {
          if (errImg) {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(errImg)}));
          } else {
            req.url += "/" + req.body.nr;
            req.method = 'GET';
            return router.handle(req, res, next);
          }
        });
        return;
      }

      req.url += "/" + req.body.nr;
      req.method = 'GET';
      return router.handle(req, res, next);
    };  
  });
};

router.put( ["/:dictionary", "/:dictionary/:id(\\d+)"], updHandler);
router.post(["/:dictionary", "/:dictionary/:id(\\d+)"], updHandler);

router.post("/:dictionary/img", upload.single('filename'), (req, res, next) => {
  const dictionary = getDictionary(res, req.params.dictionary, true);
  if (!dictionary || !dictionary.image) {
    return;
  }

  if (!req.file) {
    return res.status(400).json({ Result: 'ERROR', Message: 'No file received' });
  }

  // Read the file from disk and convert to base64
  const base64str = fs.readFileSync(req.file.path).toString('base64');

  // console.log(`[UPLOAD] table=${table}, nr=${req.body.nr}, file=${req.file.originalname}`);

  db.query('CALL dictionary_update_img(?, ?, ?)', [req.params.dictionary, req.body.nr, base64str], (err, rows, fields) => {
    // Remove temp file after saving
    fs.unlink(req.file.path, () => {});

    if (err) {
      console.error(err);
      return res.status(500).json({ Result: 'ERROR', Message: JSON.stringify(err) });
    }
    res.status(200).json({ Result: 'OK', Message: 'File uploaded successfully' });
  });
});

router.delete('/:dictionary', function(req, res, next) {
  var dictionary = getDictionary(res, req.params.dictionary, true);
  if (!dictionary) {
    return;
  }

  db.query('CALL dictionary_delete(?, ?)', [req.params.dictionary, req.body.id], function(err, rows, fields){
    res.setHeader('Content-Type', 'application/json');
    if (err) 
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message:  JSON.stringify(err)}));
    else {
      res.status(200).send(JSON.stringify({Result: 'Ok'}));
    }
  });
});

module.exports = router;
