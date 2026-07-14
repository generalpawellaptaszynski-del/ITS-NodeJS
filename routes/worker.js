var express = require('express')
    db_parameters = require('../config/db_parameters'),
    mysql = require('mysql'),
    jade = require('jade'),
    path = require('path');

var router = express.Router();
var db = mysql.createConnection(db_parameters);
var codes = require('rescode');

function normalizeWorkerRows(rows) {
  (rows || []).forEach(function (row) {
    row.img = row.img ? Buffer.from(row.img).toString() : "";
  });
  return rows || [];
}

function normalizeGroupName(value) {
  return String(value == null ? "" : value).trim();
}

function getGroupKey(value) {
  var groupId = parseInt(value, 10);
  return isFinite(groupId) && groupId > 0 ? String(groupId) : "__none__";
}

function getGroupLabel(value) {
  var groupValue = normalizeGroupName(value);
  return groupValue.length ? groupValue : "No group";
}

function createGroupNode(groupId, groupName, parentId) {
  var normalizedName = normalizeGroupName(groupName);
  var groupKey = getGroupKey(groupId);
  var numericGroupId = parseInt(groupId, 10);
  var hasGroupId = isFinite(numericGroupId) && numericGroupId > 0;

  return {
    key: "group:" + encodeURIComponent(groupKey),
    title: getGroupLabel(normalizedName),
    folder: true,
    lazy: true,
    expanded: false,
    groupName: normalizedName,
    groupKey: groupKey,
	    groupId: hasGroupId ? numericGroupId : null,
	    parent_idgrp: parentId === null || typeof parentId === "undefined" ? null : parseInt(parentId, 10),
	    count: 0,
    name: "0 workers",
	    childCount: 0,
	    node_type: "group"
	  };
	}

function buildWorkerGroupTree(groupRows, countRows, includeNoGroup) {
  var groups = new Map();

  (groupRows || []).forEach(function (row) {
    var groupId = parseInt(row.id, 10);
	    var groupName = normalizeGroupName(row.name);
	    if (!groupName.length || !isFinite(groupId) || groupId <= 0) {
	      return;
	    }

	    var groupKey = getGroupKey(groupId);
	    if (!groups.has(groupKey)) {
	      groups.set(groupKey, createGroupNode(groupId, groupName, row.parent_idgrp));
	    }
	  });

  (countRows || []).forEach(function (row) {
    var rawGroupId = row.idgrp;
    var groupId = rawGroupId === null || typeof rawGroupId === "undefined" ? null : parseInt(rawGroupId, 10);
    var groupKey = getGroupKey(groupId);
    var groupCount = parseInt(row.cnt, 10);
    if (!isFinite(groupCount) || groupCount < 0) {
      groupCount = 0;
    }

	    if (!groups.has(groupKey)) {
	      if (includeNoGroup && groupKey === "__none__") {
	        groups.set(groupKey, createGroupNode(groupId, "", null));
	      } else {
	        return;
	      }
	    }

	    var groupNode = groups.get(groupKey);
	    groupNode.count = groupCount;
	    groupNode.childCount = parseInt(row.childCount, 10) || 0;
	    groupNode.lazy = groupNode.count > 0 || groupNode.childCount > 0;
	    groupNode.name = groupCount + (groupCount === 1 ? " worker" : " workers");
	    groupNode.countLabel = groupNode.childCount
	      ? groupNode.name + ", " + groupNode.childCount + (groupNode.childCount === 1 ? " subgroup" : " subgroups")
	      : groupNode.name;
	  });

  return Array.from(groups.values()).sort(function (a, b) {
    var titleA = String(a.title || "");
    var titleB = String(b.title || "");
    if (a.groupId === null || typeof a.groupId === "undefined") {
      titleA = "\uffff";
    }
    if (b.groupId === null || typeof b.groupId === "undefined") {
      titleB = "\uffff";
    }
    return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
  });
}

function loadWorkerGroupNames(callback) {
  db.query('CALL worker_group_list()',
    function (err, groupRows) {
      if (err) {
        callback(err);
        return;
      }

      groupRows = groupRows && groupRows[0] ? groupRows[0] : groupRows;
      callback(null, (groupRows || []).map(function (row) {
	        return {
	          id: parseInt(row.id, 10) || null,
	          name: normalizeGroupName(row.name),
	          parent_idgrp: parseInt(row.parent_idgrp, 10) || null
	        };
      }).filter(function (row) {
        return row.id !== null && row.id > 0 && row.name.length > 0;
      }).sort(function (a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
      }));
    }
  );
}

function ensureWorkerGroup(name, parentId, callback) {
	  var groupName = normalizeGroupName(name);
  if (!groupName.length) {
    callback(new Error("Group name is required"));
    return;
  }

	  parentId = parseInt(parentId, 10) || null;
	  db.query('CALL worker_group_get_or_create(?, ?)',
	    [groupName, parentId],
    function (err, rows) {
      if (err) {
        callback(err);
        return;
      }

      rows = rows && rows[0] ? rows[0] : rows;
      callback(null, rows[0], !!(rows[0] && rows[0].created));
    }
  );
}

function renameWorkerGroup(groupId, oldName, newName, callback) {
  var targetName = normalizeGroupName(newName);

  if (!targetName.length) {
    callback(new Error("Group name is required"));
    return;
  }

  if (normalizeGroupName(oldName) && normalizeGroupName(oldName).toUpperCase() === targetName.toUpperCase()) {
    callback(null, { id: groupId, name: targetName }, false);
    return;
  }

  if (!groupId) {
	    ensureWorkerGroup(targetName, null, function (err3, row, created) {
      if (err3) {
        callback(err3);
        return;
      }

      callback(null, row, created);
    });
    return;
  }

  db.query('CALL worker_group_rename(?, ?)',
    [groupId, targetName],
    function (err2, rows) {
      if (err2) {
        callback(err2);
        return;
      }
      rows = rows && rows[0] ? rows[0] : rows;
      callback(null, rows[0] || { id: groupId, name: targetName }, true);
    }
  );
}

function buildWorkerLeafNodes(rows) {
  return (rows || []).map(function (row) {
    return {
      key: "w:" + row.id,
      title: String(row.nr || ""),
      folder: false,
      lazy: false,
      id: row.id,
      nr: row.nr,
      name: row.name || "",
      idgrp: row.idgrp === null || typeof row.idgrp === "undefined" ? null : parseInt(row.idgrp, 10),
      groupName: row.groupName || "",
      node_type: "worker"
    };
  });
}

/* GET page. */
router.get('/', function(req, res) {
  res.render('worker');
});

router.get('/groups', function(req, res, next) {
  loadWorkerGroupNames(function(err, rows) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    } else {
      res.status(200).send(JSON.stringify(rows || []));
    }
  });
});

router.post('/groups', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body || {}));
	  var groupId = parseInt(input.id, 10) || 0;
	  var parentId = parseInt(input.parent_idgrp, 10) || null;
  var newName = normalizeGroupName(input.name);
  var oldName = normalizeGroupName(input.oldName);

  res.setHeader('Content-Type', 'application/json');
  if (!newName.length) {
    res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Group name is required'}));
    return;
  }

  if (groupId) {
    db.query('CALL worker_group_get(?)',
      [groupId],
      function (err, rows) {
        rows = rows && rows[0] ? rows[0] : rows;
        if (err) {
          res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
          return;
        }
        if (!rows || !rows.length) {
          res.status(404).send(JSON.stringify({Result: 'ERROR', Message: 'Group not found'}));
          return;
        }

        renameWorkerGroup(groupId, rows[0].name, newName, function (err2, row) {
          if (err2) {
            res.status(err2.message === "Group already exists" ? 409 : 500)
              .send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err2)}));
            return;
          }

          res.status(200).send(JSON.stringify(row || { id: groupId, name: newName }));
        });
      }
    );
    return;
  }

  if (oldName.length && oldName.toUpperCase() !== newName.toUpperCase()) {
    renameWorkerGroup(0, oldName, newName, function (err2, row) {
      if (err2) {
        res.status(err2.message === "Group already exists" ? 409 : 500)
          .send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err2)}));
        return;
      }

      res.status(200).send(JSON.stringify(row || { name: newName }));
    });
    return;
  }

	  ensureWorkerGroup(newName, parentId, function (err3, row) {
    if (err3) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err3)}));
      return;
    }

    res.status(200).send(JSON.stringify(row || { name: newName }));
  });
});

router.delete('/groups', function(req, res, next) {
  var input = JSON.parse(JSON.stringify(req.body || {}));
  var groupId = parseInt(input.id, 10) || 0;

  res.setHeader('Content-Type', 'application/json');
  if (!groupId) {
    res.status(400).send(JSON.stringify({Result: 'ERROR', Message: 'Group id is required'}));
    return;
  }

  db.query('CALL worker_group_delete(?)', [groupId], function(err, rows) {
    if (err) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
      return;
    }

    res.status(200).send(JSON.stringify(rows && rows[0] && rows[0][0] ? rows[0][0] : {Result: 'Ok'}));
  });
});

router.get('/tree', function(req, res, next) {
  var groupParam = typeof req.query.group !== 'undefined' ? String(req.query.group).trim() : null;
  var hasTextFilter = false;
  var nr = String(req.query.nr || "").trim();
  var name = String(req.query.name || "").trim();
  hasTextFilter = nr.length > 0 || name.length > 0;

  var groupFilter = null;
  if (groupParam !== null) {
    if (groupParam.length && groupParam !== "__none__") {
      var groupId = parseInt(groupParam, 10);
      if (isFinite(groupId) && groupId > 0) {
        groupFilter = groupId;
      } else {
        groupFilter = -1;
      }
    } else {
      groupFilter = 0;
    }
  }

	  var isChildLoad = groupParam !== null;

  if (hasTextFilter && !isChildLoad) {
    db.query('CALL worker_tree_workers(?, ?, ?)', [nr || null, name || null, groupFilter], function(err, rows, fields) {
      rows = rows && rows[0] ? rows[0] : rows;
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
        return;
      }

      normalizeWorkerRows(rows);
      res.status(200).send(JSON.stringify(buildWorkerLeafNodes(rows)));
    });
    return;
  }

	  if (isChildLoad) {
	    db.query('CALL worker_tree_groups(?)', [groupFilter > 0 ? groupFilter : null], function(errGroup, groupRows) {
	      groupRows = groupRows && groupRows[0] ? groupRows[0] : groupRows;
	      res.setHeader('Content-Type', 'application/json');
	      if (errGroup) {
	        res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(errGroup)}));
	        return;
	      }

	      db.query('CALL worker_tree_counts(?, ?)', [nr || null, name || null], function(errCount, countRows) {
	        countRows = countRows && countRows[0] ? countRows[0] : countRows;
	        if (errCount) {
	          res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(errCount)}));
	          return;
	        }

	        db.query('CALL worker_tree_workers(?, ?, ?)', [nr || null, name || null, groupFilter], function(err, rows) {
	          rows = rows && rows[0] ? rows[0] : rows;
	          if (err) {
	            res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
	            return;
	          }

	          normalizeWorkerRows(rows);
	          res.status(200).send(JSON.stringify(buildWorkerGroupTree(groupRows, countRows, false).concat(buildWorkerLeafNodes(rows))));
	        });
	      });
	    });
	    return;
	  }

	  db.query('CALL worker_tree_groups(?)',
	    [null],
    function (errGroup, groupRows) {
      groupRows = groupRows && groupRows[0] ? groupRows[0] : groupRows;
      if (errGroup) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(errGroup)}));
        return;
      }

      db.query('CALL worker_tree_counts(?, ?)', [nr || null, name || null], function(err, countRows, fields) {
        countRows = countRows && countRows[0] ? countRows[0] : countRows;
        res.setHeader('Content-Type', 'application/json');
        if (err) {
          res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
          return;
        }

	        res.status(200).send(JSON.stringify(buildWorkerGroupTree(groupRows, countRows, true)));
      });
    }
  );
});

router.get('/info/:id(\\d+$)', function(req, res, next) {
  var id = req.params.id;
  db.query('CALL worker_info(?)', [id], function(err, rows, fields) {
    rows = rows && rows[0] ? rows[0] : rows;
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
      return;
    }
    if (!rows || !rows.length) {
      res.status(404).send(JSON.stringify({Result: 'ERROR', Message: 'Worker not found'}));
      return;
    }

    rows[0].img = rows[0].img ? Buffer.from(rows[0].img).toString() : "";
    res.status(200).send(JSON.stringify(rows[0]));
  });
});

/* Full info about the worker */
router.get('/:id(\\d+$)', function(req, res, next){
  let id = req.params.id;
  db.query('CALL worker_card(?)', [id], function(err, rows, fields){
    rows = rows && rows[0] ? rows[0] : rows;
    if (err) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({Result: 'ERROR', Message: JSON.stringify(err)}));
    } else if (!rows.length) {
      res.render('inf-worker', {Result: 'ERROR', Message: "Worker id=" + id + " not found."});
    } else {
        
      codes.loadModules(["code39"], {includetext:true});
      var barcode = "<img class='barcode' alt='" + rows[0].nr + "' src='data:image/png;base64," + codes.create("code39", rows[0].nr).toString("base64") + "' />";
        
      var result = {
          Message : '',
          id: id,
          barcode : barcode,
          nr : rows[0].nr,
          name : rows[0].name,
          idgrp: rows[0].idgrp,
          groupName: rows[0].groupName || "",
          img: (rows[0].img && rows[0].img.length >0 ? "data:image/jpg;base64," + rows[0].img : "")
        };  
      //console.log(result);
      
      // Text of the document
      let template = path.join(__dirname, '../views/inf-worker.jade');
      let html = jade.renderFile(template, result);  //console.log(html);
      
      // Render into HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    };  
  });
});

module.exports = router;
