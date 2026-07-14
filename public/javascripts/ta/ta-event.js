var url = "/ta/event";
var tree = null;
var defaultPeriod = "";
var currentFilterKey = "";
var dialogState = {
  mode: "add",
  node: null,
  workerId: 0,
  oldDt: ""
};

var dateFormat = "d.m.Y";
var timeFormat = "H:i:s";
var dateTimeFormat = dateFormat + " " + timeFormat;

$(function () {
  var periodsLoaded = loadPeriods();
  var workersLoaded = loadWorkers();

  $.when(periodsLoaded, workersLoaded).always(function () {
    currentFilterKey = buildFilterKey();

    initDialog();
    bindFilters();
    bindActions();
    bindContextMenu();
    updateFilterBackground();
    updateExportLink();

    tree = ITS_tree_view.initTree("#tree-report", treeOptions());
  });
});

function loadPeriods() {
  var dpdPeriod = $("#rpt-period");
  dpdPeriod.empty();

  return $.ajax({
    type: "GET",
    url: url + "/periods",
    cache: false,
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  }).done(function (data) {
    var lastPeriod = "";

    $.each(data || [], function (key, entry, index) {
      var $opt = $("<option></option>")
        .attr("value", entry.period)
        .text(entry.fullname);

      dpdPeriod.append($opt);
      lastPeriod = entry.period;
    });

    if (lastPeriod) {
      dpdPeriod.val(lastPeriod);
    }

    defaultPeriod = dpdPeriod.val() || "";
  });
}

function loadWorkers() {
  var dpdWorker = $("#rpt-worker");
  dpdWorker.empty()
           .append($("<option></option>").attr("value", "").text("... Select a worker ..."))
           .prop("selectedIndex", 0);

  return $.ajax({
    type: "GET",
    url: url + "/workers",
    cache: false,
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  }).done(function (data) {
    $.each(data || [], function (key, entry) {
      dpdWorker.append(
        $("<option></option>")
          .attr("value", entry.id)
          .text(entry.nr + " - " + entry.name)
      );
    });
  });
}

function bindFilters() {
  $("#rpt-period, #rpt-worker").on("change", function () {
    updateFilterBackground();
    commitFilter(true);
  });
}

function bindActions() {
  $("#taNewEventBtn").on("click", function () {
    if (!hasSelectedWorker()) {
      return;
    }
    openEventDialogForAdd(null);
  });
}

function initDialog() {
  $("#eventDt").datetimepicker({
    format: dateTimeFormat,
    defaultDate: new Date(),
    defaultTime: "08:00:00",
    todayButton: true,
    step: 1
  });

  $("#eventDuration").datetimepicker({
    datepicker: false,
    format: timeFormat,
    minTime: "00:01",
    defaultTime: "08:00:00",
    step: 1
  });

  $("#eventDialog").dialog({
    autoOpen: false,
    modal: true,
    width: 460,
    resizable: false,
    closeOnEscape: true,
    open: function () {
      syncDialogButtons();
    },
    buttons: [
      {
        text: "Save",
        class: "primary",
        click: function () {
          saveEventDialog();
        }
      },
      {
        text: "Cancel",
        click: function () {
          $(this).dialog("close");
        }
      }
    ]
  });
}

function treeOptions() {
  return {
    source: {
      url: buildTreeUrl(),
      cache: false
    },
    autoCollapse: true,
    renderColumns: function (event, data) {
      data.row.find(".its-tree-name").addClass("alignRight");
    }
  };
}

function bindContextMenu() {
  $.contextMenu({
    selector: "#tree-report tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node) {
        return false;
      }

      var items = {
        del: { name: "Delete", icon: "delete" }
      };

      return {
        items: items,
        callback: function (itemKey, opt) {
          var currentNode = getNodeFromTrigger(opt.$trigger);
          if (!currentNode) {
            return;
          }

          switch (itemKey) {
            case "del":
              deleteEvent(currentNode);
              break;
          }
        }
      };
    }
  });
}

function getNodeFromTrigger($trigger) {
  var $row = $trigger.closest("tr.its-tree-node");
  if (!$row.length) {
    return null;
  }
  return $row.data("itsTreeNode") || null;
}

function getPeriod() {
  return String($("#rpt-period").val() || "");
}

function getWorkerId() {
  return String($("#rpt-worker").val() || "0");
}

function hasSelectedWorker() {
  return String($("#rpt-worker").val() || "").trim().length > 0;
}

function buildFilterKey() {
  return getPeriod() + "/" + getWorkerId();
}

function buildTreeUrl() {
  return url + "/" + getPeriod() + "/" + (getWorkerId() || 0);
}

function updateExportLink() {
  $("#taExportLink").attr("href", "/ta/xls/" + getPeriod());
}

function updateFilterBackground() {
  $("#rpt-period").toggleClass("accent", String(getPeriod()).trim().length > 0);
  $("#rpt-worker").toggleClass("accent", String(getWorkerId()).trim() !== "0");
  updateActionButtons();
}

function updateActionButtons() {
  var enabled = hasSelectedWorker();
  $("#taNewEventBtn")
    .prop("disabled", !enabled)
    .toggleClass("is-disabled", !enabled)
    .attr("title", enabled ? "Add event for selected worker" : "Select a worker first");
}

function resetFilters() {
  if (defaultPeriod) {
    $("#rpt-period").val(defaultPeriod);
  }
  $("#rpt-worker").val("");
  updateFilterBackground();
  commitFilter(true);
}

function commitFilter(force) {
  var filterKey = buildFilterKey();
  updateFilterBackground();
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

  tree.options.source.url = buildTreeUrl();
  tree.reload();
  updateExportLink();
}

function openEventDialogForAdd(node) {
  var workerId = getNodeWorkerId(node);
  dialogState = {
    mode: "add",
    node: node,
    workerId: workerId,
    oldDt: ""
  };

  $("#eventDt").val(getDefaultEventDateTime(node));
  $("#eventDuration").val("08:00:00");
  $("#eventDialog").dialog("option", "title", buildDialogTitle("Add event", node)).dialog("open");
}

function openEventDialogForEdit(node) {
  dialogState = {
    mode: "edit",
    node: node,
    workerId: getNodeWorkerId(node),
    oldDt: node.data && node.data.dt ? String(node.data.dt) : ""
  };

  $("#eventDt").val(node.data && node.data.dt ? node.data.dt : "");
  $("#eventDuration").val(node.data && node.data.duration ? node.data.duration : "");
  $("#eventDialog").dialog("option", "title", buildDialogTitle("Edit event", node)).dialog("open");
}

function buildDialogTitle(prefix, node) {
  var suffix = "";

  if (node && node.data) {
    if (node.data.dt) {
      suffix = String(node.data.dt);
    } else if (node.title) {
      suffix = String(node.title);
    }
  }

  return suffix ? (prefix + " " + suffix) : prefix;
}

function getNodeWorkerId(node) {
  if (node && node.data && node.data.idworker != null) {
    return String(node.data.idworker);
  }

  return getWorkerId();
}

function getDefaultEventDateTime(node) {
  if (node && node.data) {
    if (node.data.day_label) {
      return node.data.day_label + " 08:00:00";
    }
    if (node.data.dt) {
      return String(node.data.dt);
    }
  }

  var period = getPeriod();
  if (/^\d{6}$/.test(period)) {
    return "01." + period.slice(4, 6) + "." + period.slice(0, 4) + " 08:00:00";
  }

  return "";
}

function syncDialogButtons() {
  var hasDt = String($("#eventDt").val() || "").trim().length > 0;
  var hasDuration = String($("#eventDuration").val() || "").trim().length > 0;
  var enabled = hasDt && hasDuration;
  var $save = $("#eventDialog").dialog("widget").find(".ui-dialog-buttonpane button:contains('Save')");
  if ($save.length) {
    $save.button("option", "disabled", !enabled);
  }
}

function saveEventDialog() {
  var dt = String($("#eventDt").val() || "").trim();
  var duration = String($("#eventDuration").val() || "").trim();

  if (!dt || !duration) {
    return;
  }

  var workerId = dialogState.workerId || getWorkerId();
  if (!workerId || workerId === "0") {
    alert("Select a worker first.");
    return;
  }

  var isEdit = dialogState.mode === "edit";
  var ajaxData = {
    dt: dt,
    duration: duration
  };

  if (isEdit) {
    ajaxData.oldDt = dialogState.oldDt;
  }

  $.ajax({
    type: isEdit ? "PUT" : "POST",
    url: url + "/" + getPeriod() + "/" + workerId,
    data: ajaxData,
    cache: false,
    success: function () {
      $("#eventDialog").dialog("close");
      reloadTree();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function deleteEvent(node) {
  if (!node || !node.data) {
    return;
  }

  if (!confirm("Delete '" + (node.data.dt || node.title || "") + "'?")) {
    return;
  }

  $.ajax({
    type: "DELETE",
    url: url,
    data: {
      idworker: node.data.idworker,
      dt: node.data.dt,
      duration: node.data.duration
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
