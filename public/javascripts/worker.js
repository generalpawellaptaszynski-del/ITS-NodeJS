var crudUrl = "/dictionary/worker";
var treeUrl = "/worker/tree";
var tree = null;
var currentFilterKey = "";
var workerInfoCache = {};
var hoverState = {
  workerId: "",
  x: 0,
  y: 0
};
var editState = {
  mode: "add",
  worker: null,
  workerGroupValue: "",
  pendingImageBase64: null,
  existingImageBase64: ""
};

$(function () {
  bindFilters();
  bindToolbar();
  bindContextMenu();
  bindHoverPopup();
  bindEditModal();
  updateFilterHighlight();
  loadGroupOptions();

  currentFilterKey = buildFilterKey();
  tree = ITS_tree_view.initTree("#tree-items", treeOptions());
});

function bindFilters() {
  $("#fltr-nr, #fltr-name").on("input", updateFilterHighlight);
  $("#fltr-nr, #fltr-name").on("change", function () {
    commitFilter(true);
  });
  $("#fltr-nr, #fltr-name").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      $(this).blur();
    }
  });

  $("#btnResetFltr").on("click", function () {
    $("#fltr-nr").val("");
    $("#fltr-name").val("");
    updateFilterHighlight();
    commitFilter(true);
  });
}

function bindToolbar() {
  $("#btnNewWorker").on("click", function () {
    openAddWorkerDialog();
  });

  $("#btnNewGroup").on("click", function () {
    openNewGroupDialog();
  });
}

function openNewGroupDialog() {
  var groupName = prompt("Group name");
  if (!groupName) {
    return;
  }

  groupName = String(groupName).trim();
  if (!groupName.length) {
    return;
  }

  saveWorkerGroup({
    name: groupName
  });
}

function openNewSubgroupDialog(node) {
  if (!node || !node.data || !node.data.groupId) {
    return;
  }

  var subgroupName = prompt("Subgroup name");
  if (!subgroupName) {
    return;
  }

  subgroupName = String(subgroupName).trim();
  if (!subgroupName.length) {
    return;
  }

  saveWorkerGroup({
    name: subgroupName,
    parent_idgrp: node.data.groupId
  });
}

function openEditGroupDialog(node) {
  if (!node || !node.data) {
    return;
  }

  var currentName = String(node.data.groupName || node.title || "").trim();
  if (!currentName.length) {
    return;
  }

  var groupName = prompt("Group name", currentName);
  if (!groupName) {
    return;
  }

  groupName = String(groupName).trim();
  if (!groupName.length || groupName === currentName) {
    return;
  }

  saveWorkerGroup({
    id: node.data.groupId || "",
    oldName: currentName,
    name: groupName
  });
}

function saveWorkerGroup(payload) {
  $.ajax({
    type: "POST",
    url: "/worker/groups",
    data: payload,
    cache: false,
    success: function () {
      loadGroupOptions();
      reloadTree();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function bindContextMenu() {
  $.contextMenu({
    selector: "#tree-items tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node || !node.data || !node.data.node_type) {
        return false;
      }

      if (node.data.node_type === "group") {
        if (node.data.groupId === null || typeof node.data.groupId === "undefined") {
          return false;
        }

        return {
          items: {
            add_subgroup: { name: "Add new subgroup", icon: "add" },
            add_worker: { name: "New worker", icon: "add" },
            edit: { name: "Edit group name", icon: "edit" },
            del: { name: "Delete", icon: "delete", disabled: Number(node.data.count || 0) > 0 }
          },
          callback: function (itemKey, opt) {
            var currentNode = getNodeFromTrigger(opt.$trigger);
            if (!currentNode) {
              return;
            }

            if (itemKey === "add_subgroup") {
              openNewSubgroupDialog(currentNode);
            } else if (itemKey === "add_worker") {
              openAddWorkerDialog(getNodeGroupId(currentNode));
            } else if (itemKey === "edit") {
              openEditGroupDialog(currentNode);
            } else if (itemKey === "del") {
              deleteWorkerGroup(currentNode);
            }
          }
        };
      }

      if (node.data.node_type === "worker") {
        return {
          items: {
            edit: { name: "Edit", icon: "edit" },
            del: { name: "Delete", icon: "delete" }
          },
          callback: function (itemKey, opt) {
            var currentNode = getNodeFromTrigger(opt.$trigger);
            if (!currentNode) {
              return;
            }

            if (itemKey === "edit") {
              openEditWorkerDialog(currentNode);
            } else if (itemKey === "del") {
              deleteWorker(currentNode);
            }
          }
        };
      }

      return false;
    }
  });
}

function bindHoverPopup() {
  $("#tree-items")
    .on("mouseenter", "tr[data-node-type='worker']", function (e) {
      var node = getNodeFromTrigger($(this));
      if (!node || !node.data || node.data.node_type !== "worker") {
        return;
      }
      var workerId = String(node.data.id || "");
      if (!workerId) {
        return;
      }

      hoverState.workerId = workerId;
      hoverState.x = e.clientX;
      hoverState.y = e.clientY;

      showHoverPopup(node.data, e.clientX, e.clientY);

      fetchWorkerInfo(workerId).done(function (info) {
        if (hoverState.workerId !== workerId) {
          return;
        }
        showHoverPopup(info, hoverState.x, hoverState.y);
      });
    })
    .on("mousemove", "tr[data-node-type='worker']", function (e) {
      var node = getNodeFromTrigger($(this));
      if (!node || !node.data || node.data.node_type !== "worker") {
        return;
      }
      hoverState.x = e.clientX;
      hoverState.y = e.clientY;
      positionHoverPopup(e.clientX, e.clientY);
    })
    .on("mouseleave", "tr[data-node-type='worker']", function () {
      hoverState.workerId = "";
      hideHoverPopup();
    });
}

function bindEditModal() {
  $("#edit_item_nr, #edit_item_name").on("input", syncEditButtons);

  $("#edit_item_img").on("change", function () {
    var file = this.files && this.files[0];
    if (!file) {
      editState.pendingImageBase64 = null;
      if (editState.existingImageBase64) {
        setEditPreview(editState.existingImageBase64);
      } else {
        $("#edit_item_preview").hide();
      }
      syncEditButtons();
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too big!");
      editState.pendingImageBase64 = null;
      this.value = "";
      if (editState.existingImageBase64) {
        setEditPreview(editState.existingImageBase64);
      } else {
        $("#edit_item_preview").hide();
      }
      syncEditButtons();
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      var dataUrl = String(ev.target && ev.target.result ? ev.target.result : "");
      var parts = dataUrl.split(",");
      editState.pendingImageBase64 = parts.length > 1 ? parts[1] : "";
      $("#edit_item_preview").attr("src", dataUrl).show();
      syncEditButtons();
    };
    reader.readAsDataURL(file);
  });

  $("#btnEditSave").on("click", function () {
    saveWorker();
  });

  $("#btnEditCancel").on("click", function () {
    closeEditModal();
  });

  $("#editModalOverlay").on("click", function (e) {
    if (e.target === this) {
      closeEditModal();
    }
  });
}

function treeOptions() {
  return {
    source: {
      url: buildTreeUrl(),
      cache: false
    },
    autoCollapse: false,
    getChildUrl: function (node) {
      var groupId = getNodeGroupId(node);
      return treeUrl + buildFilterQuery(groupId.length ? groupId : "__none__");
    },
    onNodeClick: function (node) {
      if (node && node.folder && tree) {
        tree.toggleNode(node);
      }
    },
    renderColumns: function (_, ctx) {
      var node = ctx && ctx.node ? ctx.node : null;
      var $row = ctx && ctx.row ? ctx.row : null;
      if (!node || !$row) {
        return;
      }

      var nodeType = node.data && node.data.node_type ? String(node.data.node_type) : "";
      $row.attr("data-node-type", nodeType);
      $row.toggleClass("worker-group-row", nodeType === "group");
      $row.toggleClass("worker-item-row", nodeType === "worker");

      if (nodeType === "group") {
        $row.find(".its-tree-nr").empty();
        $row.find(".its-tree-name").html(
          '<span class="worker-group-label">' + escapeHtml(node.data.groupName || "No group") + '</span>' +
          '<span class="worker-group-count">' + escapeHtml(node.data.name || "") + '</span>'
        );
      } else if (nodeType === "worker") {
        $row.find(".its-tree-nr").text(node.title || "");
        $row.find(".its-tree-name").text(node.data.name || node.data.nr || "");
      }
    }
  };
}

function buildTreeUrl() {
  return treeUrl + buildFilterQuery();
}

function buildFilterQuery(groupValue) {
  var parts = [];
  var nr = String($("#fltr-nr").val() || "").trim();
  var name = String($("#fltr-name").val() || "").trim();

  if (nr.length) {
    parts.push("nr=" + encodeURIComponent(nr));
  }
  if (name.length) {
    parts.push("name=" + encodeURIComponent(name));
  }
  if (typeof groupValue !== "undefined" && groupValue !== null) {
    parts.push("group=" + encodeURIComponent(String(groupValue)));
  }

  return parts.length ? "?" + parts.join("&") : "";
}

function getNodeGroupId(node) {
  if (!node) {
    return "";
  }

  if (node.data && Object.prototype.hasOwnProperty.call(node.data, "groupId")) {
    return String(node.data.groupId == null ? "" : node.data.groupId).trim();
  }

  if (node.data && Object.prototype.hasOwnProperty.call(node.data, "idgrp")) {
    return String(node.data.idgrp == null ? "" : node.data.idgrp).trim();
  }

  var key = String(node.key || "");
  if (key.indexOf("group:") === 0) {
    try {
      return decodeURIComponent(key.substring(key.indexOf(":") + 1));
    } catch (e) {
      return key.substring(key.indexOf(":") + 1);
    }
  }

  return "";
}

function buildFilterKey() {
  return [
    String($("#fltr-nr").val() || "").trim(),
    String($("#fltr-name").val() || "").trim()
  ].join("/");
}

function commitFilter(force) {
  var filterKey = buildFilterKey();
  updateFilterHighlight();

  if (!force && filterKey === currentFilterKey) {
    return;
  }

  currentFilterKey = filterKey;
  reloadTree();
}

function reloadTree() {
  if (!tree) {
    return;
  }

  workerInfoCache = {};
  hideHoverPopup();
  tree.options.source.url = buildTreeUrl();
  tree.reload();
}

function updateFilterHighlight() {
  $("#fltr-nr, #fltr-name").each(function () {
    var hasValue = String($(this).val() || "").trim().length > 0;
    $(this).toggleClass("accent", hasValue);
  });
}

function loadGroupOptions() {
  $.getJSON("/worker/groups")
    .done(function (rows) {
      populateGroupSelects(rows || []);
    })
    .fail(function () {
      populateGroupSelects([]);
    });
}

function populateGroupSelects(rows) {
  var currentEdit = String(editState.workerGroupValue || $("#edit_item_grp").val() || "").trim();
  var groups = [];
  var seen = {};

  (rows || []).forEach(function (row) {
    var id = parseInt(row && row.id, 10);
    var name = String(row && row.name != null ? row.name : "").trim();
    if (isFinite(id) && id > 0 && name.length && !seen[id]) {
      seen[id] = true;
      groups.push({
        id: String(id),
        name: name
      });
    }
  });

  groups.sort(function (a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });

  fillGroupSelect($("#edit_item_grp"), groups, "No group", currentEdit);
  if (editState.mode === "edit") {
    $("#edit_item_grp").val(currentEdit);
  }
}

function fillGroupSelect($select, groups, emptyLabel, selectedValue) {
  if (!$select || !$select.length) {
    return;
  }

  var value = String(selectedValue || "").trim();
  var options = ['<option value="">' + emptyLabel + '</option>'];

  groups.forEach(function (groupName) {
    var safeValue = String(groupName && groupName.id != null ? groupName.id : "");
    var safeLabel = String(groupName && groupName.name != null ? groupName.name : "");
    var selected = safeValue === value ? ' selected="selected"' : "";
    options.push(
      '<option value="' + escapeHtmlAttr(safeValue) + '"' + selected + '>' +
      escapeHtml(safeLabel) +
      '</option>'
    );
  });

  $select.html(options.join(""));
  if (value && groups.some(function (groupName) {
    return String(groupName && groupName.id != null ? groupName.id : "") === value;
  })) {
    $select.val(value);
  } else {
    $select.val("");
  }
}

function getNodeFromTrigger($trigger) {
  var $row = $trigger.closest("tr.its-tree-node");
  if (!$row.length) {
    return null;
  }
  return $row.data("itsTreeNode") || null;
}

function openAddWorkerDialog(groupId) {
  var selectedGroupId = String(groupId || "").trim();

  editState = {
    mode: "add",
    worker: null,
    workerGroupValue: selectedGroupId,
    pendingImageBase64: null,
    existingImageBase64: ""
  };

  $("#editModalTitle").text("Add employee");
  $("#edit_item_key").val("");
  $("#edit_item_nr").val("");
  $("#edit_item_name").val("");
  $("#edit_item_grp").val(selectedGroupId);
  $("#edit_item_img").val("");
  $("#edit_item_preview").hide();
  syncEditButtons();
  showEditModal();
}

function openEditWorkerDialog(node) {
  if (!node || !node.data) {
    return;
  }

  editState = {
    mode: "edit",
    worker: node.data,
    workerGroupValue: String(node.data.idgrp == null ? "" : node.data.idgrp).trim(),
    pendingImageBase64: null,
    existingImageBase64: String(node.data.img || "")
  };

  $("#editModalTitle").text("Edit employee");
  $("#edit_item_key").val(String(node.data.id || ""));
  $("#edit_item_nr").val(node.data.nr || "");
  $("#edit_item_name").val(node.data.name || "");
  $("#edit_item_grp").val(editState.workerGroupValue);
  $("#edit_item_img").val("");

  if (editState.existingImageBase64) {
    setEditPreview(editState.existingImageBase64);
  } else {
    $("#edit_item_preview").hide();
  }

  syncEditButtons();
  showEditModal();

  fetchWorkerInfo(node.data.id).done(function (info) {
    if (!editState.worker || String(editState.worker.id || "") !== String(info.id || "")) {
      return;
    }

    editState.worker = info;
    editState.workerGroupValue = String(info.idgrp == null ? "" : info.idgrp).trim();
    editState.existingImageBase64 = String(info.img || "");
    $("#edit_item_grp").val(editState.workerGroupValue);

    if (editState.existingImageBase64) {
      setEditPreview(editState.existingImageBase64);
    } else {
      $("#edit_item_preview").hide();
    }
  });
}

function setEditPreview(base64) {
  if (!base64) {
    $("#edit_item_preview").hide();
    return;
  }

  $("#edit_item_preview")
    .attr("src", "data:image/jpeg;base64," + base64)
    .show();
}

function showEditModal() {
  $("#editModalOverlay").css("display", "flex").hide().fadeIn(150);
}

function closeEditModal() {
  $("#editModalOverlay").fadeOut(150);
}

function syncEditButtons() {
  var hasNr = String($("#edit_item_nr").val() || "").trim().length > 0;
  var hasName = String($("#edit_item_name").val() || "").trim().length > 0;
  var enabled = hasNr && hasName;

  $("#btnEditSave")
    .prop("disabled", !enabled)
    .css({
      opacity: enabled ? 1 : 0.6,
      cursor: enabled ? "pointer" : "not-allowed"
    });
}

function saveWorker() {
  var nr = String($("#edit_item_nr").val() || "").trim();
  var name = String($("#edit_item_name").val() || "").trim();
  var idgrp = String($("#edit_item_grp").val() || "").trim();

  if (!nr || !name) {
    return;
  }

  var payload = {
    nr: nr,
    name: name,
    idgrp: idgrp.length ? idgrp : null
  };

  if (editState.mode === "edit" && editState.worker && editState.worker.id != null) {
    payload.id = editState.worker.id;
  }

  if (editState.pendingImageBase64 !== null && editState.pendingImageBase64.length > 0) {
    payload.img = editState.pendingImageBase64;
  }

  $.ajax({
    type: editState.mode === "edit" ? "PUT" : "POST",
    url: crudUrl,
    data: payload,
    cache: false,
    success: function () {
      closeEditModal();
      reloadTree();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function deleteWorker(node) {
  if (!node || !node.data) {
    return;
  }

  var label = String(node.data.nr || "") + " - " + String(node.data.name || "");
  if (!confirm("Delete '" + label + "'?")) {
    return;
  }

  $.ajax({
    type: "DELETE",
    url: crudUrl,
    data: {
      id: node.data.id
    },
    cache: false,
    success: function () {
      reloadTree();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function deleteWorkerGroup(node) {
  if (!node || !node.data || !node.data.groupId) {
    return;
  }

  var label = String(node.data.groupName || node.title || "");
  if (!confirm("Delete group '" + label + "'?")) {
    return;
  }

  $.ajax({
    type: "DELETE",
    url: "/worker/groups",
    data: { id: node.data.groupId },
    cache: false,
    success: function () {
      loadGroupOptions();
      reloadTree();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function fetchWorkerInfo(id) {
  var key = String(id || "").trim();
  var deferred;

  if (!key) {
    return $.Deferred().reject().promise();
  }

  if (workerInfoCache[key]) {
    deferred = $.Deferred();
    deferred.resolve(workerInfoCache[key]);
    return deferred.promise();
  }

  return $.getJSON("/worker/info/" + encodeURIComponent(key)).then(function (info) {
    var data = info || {};
    workerInfoCache[key] = data;
    return data;
  });
}

function showHoverPopup(worker, x, y) {
  if (!worker) {
    return;
  }

  $("#hp_name").text(worker.name || "");
  $("#hp_nr").text(worker.nr || "");
  $("#hp_group").text(worker.groupName || "No group");

  if (worker.img) {
    $("#hp_preview")
      .attr("src", "data:image/jpeg;base64," + worker.img)
      .show();
  } else {
    $("#hp_preview").hide();
  }

  var $p = $("#hoverPopup").stop(true, true).show();
  var pw = $p.outerWidth();
  var ph = $p.outerHeight();
  var winW = $(window).width();
  var winH = $(window).height();
  var left = x + 12;
  var top = y + 12;

  if (left + pw + 10 > winW) {
    left = winW - pw - 10;
  }
  if (top + ph + 10 > winH) {
    top = winH - ph - 10;
  }
  if (left < 10) {
    left = 10;
  }
  if (top < 10) {
    top = 10;
  }

  $p.css({ left: left, top: top });
}

function positionHoverPopup(x, y) {
  var $p = $("#hoverPopup");
  if (!$p.is(":visible")) {
    return;
  }

  var pw = $p.outerWidth();
  var ph = $p.outerHeight();
  var winW = $(window).width();
  var winH = $(window).height();
  var left = x + 12;
  var top = y + 12;

  if (left + pw + 10 > winW) {
    left = winW - pw - 10;
  }
  if (top + ph + 10 > winH) {
    top = winH - ph - 10;
  }
  if (left < 10) {
    left = 10;
  }
  if (top < 10) {
    top = 10;
  }

  $p.css({ left: left, top: top });
}

function hideHoverPopup() {
  $("#hoverPopup").hide();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value);
}
