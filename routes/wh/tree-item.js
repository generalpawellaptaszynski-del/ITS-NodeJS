
/* tree-item.js with SQL SPs */

var express = require('express');
var mysql = require('mysql');
var db_parameters = require('../../config/db_parameters');
var multer = require('multer');
var path = require('path');
var fs = require('fs');

var router = express.Router();
var db = mysql.createPool(db_parameters);

/* ============================================================
   MULTER – EXACT SAME CONFIG AS dictionary.js (diskStorage)
============================================================ */
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

var upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

/* ============================================================
   GET vendors (for dropdown)
============================================================ */
router.get('/vendors', function (req, res) {
  db.query("CALL wh_Get_vendors()", function (err, rows) {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

/* ============================================================
   GET groups (for dropdown)
============================================================ */
router.get('/groups', function (req, res) {
  db.query("CALL wh_Get_groups()", function (err, rows) {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

/* ============================================================
   GET users (for stock management)
============================================================ */
router.get('/workers', function (req, res) {
  db.query("CALL wh_Get_workers()", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

/* ============================================================
   GET Item information
============================================================ */
function getItemById(id) {
  return new Promise((resolve, reject) => {

    db.query("CALL wh_Get_item(?)", [id], function (err, rows) {
      if (err) return reject(err);

      if (!rows[0].length) return resolve(null);

      const r = rows?.[0]?.[0];
      if (!r) return resolve(null);

      resolve({
        id    : r.id,
        name  : r.name,
        nr    : r.nr,
        idgrp : r.idgrp,
        grp   : r.grp,
        vendor: r.vendor,
        minQty: r.minQty,
        itemNo: r.itemNo,
        price : r.price,
        img   : (r.img ? Buffer.from(r.img).toString() : "")
      });
    });
  });
}

/* ============================================================
   GET Item details
============================================================ */
router.get("/item/:id", async function (req, res) {
  try {
    const item = await getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* ============================================================
   LAST 10 operations for item
============================================================ */
router.get('/item/:id/last10', function (req, res) {

  db.query(
    "CALL wh_Get_item_last10(?)",
    [req.params.id],
    function (err, rows) {
      if (err) return res.status(500).json(err);
      res.json(rows[0]);
    }
  );
});

/* ============================================================
   is-empty check (UNCHANGED)
============================================================ */
router.get("/is-empty/:id", function (req, res) {
  const id = req.params.id.split("/").pop();
  if (id === "_" || isNaN(id)) return res.json({ empty: false });

  db.query("CALL wh_Is_empty(?)", [id], function (err, rows) {
    if (err) return res.status(500).json({ empty: false });
    res.json({ empty: !!(rows[0][0] && rows[0][0].empty) });
  });
});

/* ============================================================
   TREE loader (UNCHANGED – dynamic SQL)
============================================================ */
function sendTree(req, res, id) {
  const isRoot = !id || id === "0" || id === "null";
 
  const filters = {
    name  : req.query.item_name?.trim()   || "",
    itemNo: req.query.item_itemNo?.trim() || "",
    nr    : req.query.item_nr?.trim()     || "",
    vendor: req.query.item_vendor?.trim() || ""
  };

  db.query("CALL wh_Tree_items(?, ?, ?, ?, ?)",
    [isRoot ? null : id, filters.name || null, filters.itemNo || null, filters.nr || null, filters.vendor || null],
    function (err, rows) {
      if (err) return res.status(500).json(err);
      res.json((rows[0] || []).concat(rows[1] || []));
  });
}

router.get("/", function (req, res) {
  sendTree(req, res, "0");
});

router.get("/0/:id", function (req, res) {
  sendTree(req, res, req.params.id);
});

router.get("/:id", function (req, res) {
  sendTree(req, res, req.params.id);
});

/* ============================================================
   Print Basket Items (pdf)
============================================================ */

const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");

router.post("/basket/print", async (req, res) => {
  try {
  const IMG_SIZE = 96;
  const GAP = 12;
  const LEFT_COL_WIDTH = IMG_SIZE;
  const RIGHT_COL_X_OFFSET = LEFT_COL_WIDTH + GAP;
  const LABEL_PADDING = 8; // padding inside label
  const PAGE_WIDTH = 550;

  const { items } = req.body;
  if (!items || !items.length) return res.status(400).send("Empty basket");

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("Basket items", { align: "center" });
  doc.moveDown();

  for (const it of items) {
    const item = await getItemById(it.iditem);
    if (!item) continue;

    // Page break protection
    if (doc.y > doc.page.height - 180) {
      doc.addPage();
    }

    const startX = doc.x;
    const startY = doc.y;

    // Reserve cursor for label content
    let cursorY = startY + LABEL_PADDING;

    /* -----------------------------
       LEFT COLUMN — IMAGE (aspect ratio)
    ----------------------------- */
    if (item.img) {
      try {
        const imgBuffer = Buffer.from(item.img, "base64");
        doc.image(imgBuffer, startX + LABEL_PADDING, cursorY, { width: IMG_SIZE });
      } catch (imgErr) {
        doc.rect(startX + LABEL_PADDING, cursorY, IMG_SIZE, IMG_SIZE).stroke();
      }
    } else {
      doc
        .rect(startX + LABEL_PADDING, cursorY, IMG_SIZE, IMG_SIZE)
        .stroke();
    }

    /* -----------------------------
       RIGHT COLUMN — CONTENT
    ----------------------------- */
    const rightX = startX + RIGHT_COL_X_OFFSET;
    doc.x = rightX;
    doc.y = cursorY;

    // Item name
    doc.fontSize(12).font("Helvetica-Bold").text(item.name || "—", { width: 360 });
    cursorY = doc.y + 2;

    // Barcode (aspect ratio)
    if (item.nr) {
      const barcode = await bwipjs.toBuffer({
        bcid: "code128",
        text: String(item.nr),
        scale: 3,
        height: 20,
        includetext: true,
        textxalign: "center",
      });

      doc.image(barcode, rightX, cursorY, { height: 40 });
      cursorY += 50; // space below barcode
    }

    // Item details
    doc.x = rightX;
    doc.y = cursorY;
    doc.font("Helvetica").fontSize(9);
    doc.text(`Storage: ${item.nr || ""}`);
    doc.text(`Group: ${item.grp || ""}`);
    doc.text(`Vendor: ${item.vendor || ""}`);
    doc.text(`Min qty: ${item.minQty || ""}`);
    doc.text(`Price: ${item.price || ""}`);

    // Calculate total label height
    const contentBottom = doc.y + LABEL_PADDING;
    const imgBottom = startY + LABEL_PADDING + IMG_SIZE;
    const labelHeight = Math.max(contentBottom, imgBottom) - startY;

    // Draw frame around label
    doc
      .lineWidth(0.5)
      .rect(startX, startY, PAGE_WIDTH, labelHeight)
      .stroke();

    // Move cursor below label
    doc.y = startY + labelHeight + 12;
    doc.x = startX;
  }

  doc.end();
  } catch (err) {
    console.error("BASKET PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).send(err.message || "Failed to generate PDF");
    } else {
      res.end();
    }
  }
});

/* ============================================================
   BATCH STOCK operation (Basket → single transaction)
============================================================ */
router.post("/stock/batch", function (req, res) {

  const { op, userid, doc, items } = req.body;
  // items = [{ iditem, qty }, ...]

  if (!op || !userid || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Invalid data" });
  }

  db.getConnection(function (err, connection) {
    if (err) return res.status(500).json(err);

    connection.beginTransaction(function (err) {
      if (err) {
        connection.release();
        return res.status(500).json(err);
      }

      connection.query("CALL wh_Post_stock_batch(?, ?, ?, ?)", [op, userid, doc || "", JSON.stringify(items)], function (err) {
        if (err) return rollback(connection, err);

        connection.commit(function (err) {
          connection.release();
          if (err) return res.status(500).json({ error: err.message || err });
          res.json({ ok: true });
        });
      });
    });

    function rollback(connection, err) {
      connection.rollback(function () {
        connection.release();
        console.error("BATCH STOCK ROLLBACK:", err);
	        res.status(500).json({ error: err.message || err.sqlMessage || err });
	      });
    }
  });
});

/* ============================================================
   Create new ROOT group
============================================================ */
router.post('/group', function (req, res) {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });

  db.query("CALL wh_Post_group(?)", [name], function (err, rows) {
    if (err) return res.status(500).json(err);
    res.json({ id: rows[0][0].id, name });
  });
});

/* ============================================================
   Create subgroup under parent group
============================================================ */
router.post("/group/:parentId", function (req, res) {
  const parentId = req.params.parentId;
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });

  db.query(
    "CALL wh_Post_group_child(?,?)",
    [name, parentId],
    function (err, rows) {
      if (err) return res.status(500).json(err);
      res.json({ ok: true, id: rows[0][0].id });
    }
  );
});

/* ============================================================
   Create NEW item in a group (+ optional image)
 ============================================================ */
router.post("/item/:groupId", upload.single("img"), function (req, res) {
  const name    = req.body.name   || "";
  const groupId = req.params.groupId || null;
  const vendor  = req.body.vendor || "";
  const minQty  = req.body.minQty || 0;
  const nr      = req.body.nr     || "";
  const itemNo  = req.body.itemNo || "";
  const price   = req.body.price  || 0;

  db.query(
    "CALL wh_Post_item(?,?,?,?,?,?,?)",
    [name, groupId, vendor, minQty, nr, itemNo, price],
    function (err, rows) {

      if (err) return res.status(500).json(err);

      const itemId = rows[0][0].id;

      if (!req.file) {
        return res.json({ ok: true, id: itemId, img: false });
      }

      const base64str = fs.readFileSync(req.file.path).toString('base64');
      fs.unlink(req.file.path, () => {});

      db.query("CALL wh_Put_item_img(?, ?)", [itemId, base64str], function (err2) {
        if (err2) return res.status(500).json(err2);
        res.json({ ok: true, id: itemId, img: true });
      });
    }
  );
});

function deleteWhDocItem(req, res) {
  const iddoc = Number(req.params.iddoc);
  const iditem = req.params.iditem == null ? null : Number(req.params.iditem);

  if (!Number.isFinite(iddoc) || iddoc <= 0 || (iditem !== null && (!Number.isFinite(iditem) || iditem <= 0))) {
    return res.status(400).json({ error: "Invalid document item delete request" });
  }

  db.query(
    "CALL wh_Delete_doc_item(?,?)",
    [iddoc, iditem],
    err => err
      ? res.status(500).json(err)
      : res.json({ ok: true })
  );
}

router.delete('/wh_doc_item/:iddoc/:iditem', deleteWhDocItem);
router.delete('/wh_doc_item/:iddoc', deleteWhDocItem);

/* ============================================================
   Update item OR group (PUT)  (UNCHANGED)
 ============================================================ */
router.put("/:id", upload.single("img"), function (req, res) {

  const rawId = req.params.id;
  const id = rawId.split("/").pop();

  if (req.body.name && !req.body.idgrp && !req.file) {
    return db.query(
      "CALL wh_Put_group(?, ?)",
      [id, req.body.name.trim()],
      function (err) {
        if (err) return res.status(500).json({ error: err });
        return res.json({ ok: true, type: "group-renamed" });
      }
    );
  }

  const name   = req.body.name   || "";
  const idgrp  = req.body.idgrp  || null;
  const vendor = req.body.vendor || "";
  const minQty = req.body.minQty || 0;
  const nr     = req.body.nr     || "";
  const itemNo = req.body.itemNo || "";
  const price  = req.body.price  || 0;

  db.query("CALL wh_Put_item(?, ?, ?, ?, ?, ?, ?, ?)", [id, name, idgrp, vendor, minQty, nr, itemNo, price], function (err) {
    if (err) return res.status(500).json({ error: err });

    if (!req.file) return res.json({ ok: true, type: "item-updated" });

    const base64str = fs.readFileSync(req.file.path).toString('base64');
    fs.unlink(req.file.path, () => {});

    db.query("CALL wh_Put_item_img(?, ?)", [id, base64str], function (err2) {
      if (err2) return res.status(500).json(err2);
      res.json({ ok: true, type: "item-updated", img: true });
    });
  });
});

/* ============================================================
   Remove group or item
============================================================ */
router.delete("/:id", function (req, res) {
  const id = Number(req.params.id.split("/").pop());

  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  db.query("CALL wh_Get_group_exists(?)", [id], function (err, rows) {
    if (err) return res.status(500).json(err);

    if (rows[0].length) {
      db.query("CALL wh_Delete_group(?)", [id], function (err2) {
        if (err2) return res.status(400).json({ error: err2.sqlMessage || err2 });
        return res.json({ ok: true });
      });
      return;
    }

	    db.query("CALL wh_Delete_item(?)", [id], function (err2) {
	      if (err2) return res.status(400).json({ error: err2.sqlMessage || err2.message || err2 });
	      res.json({ ok: true });
	    });
  });
});

module.exports = router;
