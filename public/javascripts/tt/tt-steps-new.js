var url = "/dictionary/step";
var tree = null;
var lastAppliedFilter = "";
var suppressNextFilterBlurCommit = false;
var editorState = {
  mode: "edit",
  node: null,
  parentKey: "_"
};

$(function () {
  lastAppliedFilter = getFltr();

  $("#btnResetFltr").on("click", function () {
    $("#step_name").val("");
    updateFilterBackground();
    commitFilter(true);
  });

  $("#btnResetFltr").on("mousedown", function () {
    suppressNextFilterBlurCommit = true;
  });

  $("#step_name")
    .on("input", function () {
      updateFilterBackground();
      scheduleFilterCommit();
    })
    .on("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitFilter(true);
      }
    })
    .on("blur", function () {
      if (suppressNextFilterBlurCommit) {
        suppressNextFilterBlurCommit = false;
        return;
      }
      commitFilter(false);
    });

  $("#productDialog").dialog({
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
          saveDialog();
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

  $("#productDialog input").on("input change", syncDialogButtons);
  $("#productDialogForm").on("submit", function (e) {
    e.preventDefault();
    saveDialog();
  });

  tree = ITS_tree_view.initTree("#tree", treeOptions());
  updateFilterBackground();

  $.contextMenu({
    selector: "#tree tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node) {
        return false;
      }

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
            openDialogForEdit(currentNode);
          } else if (itemKey === "del") {
            deleteNode(currentNode);
          }
        }
      };
    }
  });

  $("#btnAddProductGrpNew").on("click", function () {
    openDialogForAdd();
  });
});

function treeOptions() {
  return {
    source: { url: url + lastAppliedFilter, cache: false },
    autoCollapse: true,
    renderColumns: function (event, data) {
      var node = data.node;
      var $row = data.row;
      $row.find(".its-tree-name").text((node.data && (node.data.displayName || node.data.name)) || "");
    }
  };
}

function getFltr() {
  return ITS_tree_view.buildQueryFromSelectors(["#step_name"]);
}

function reloadTree() {
  if (!tree) {
    return;
  }

  tree.options.source.url = url + lastAppliedFilter;
  tree.reload();
}

function commitFilter(force) {
  var filter = getFltr();
  updateFilterBackground();
  if (!force && filter === lastAppliedFilter) {
    return;
  }
  lastAppliedFilter = filter;
  reloadTree();
}

var filterCommitTimer = null;
function scheduleFilterCommit() {
  clearTimeout(filterCommitTimer);
  filterCommitTimer = setTimeout(function () {
    commitFilter(false);
  }, 300);
}

function updateFilterBackground() {
  var $input = $("#step_name");
  var hasValue = String($input.val() || "").trim().length > 0;
  $input.toggleClass("clsFltrActive", hasValue);
}

function getNodeFromTrigger($trigger) {
  var $row = $trigger.closest("tr.its-tree-node");
  if (!$row.length) {
    return null;
  }
  return $row.data("itsTreeNode") || null;
}

function openDialogForEdit(node) {
  editorState = {
    mode: "edit",
    node: node,
    parentKey: null
  };

  $("#productDialog").dialog("option", "title", "Edit step");
  $("#productDialogMode").val("edit");
  $("#productDialogKey").val(node.key);
  $("#productDialogParentKey").val("");
  $("#productDialogNr").val(node.title || "");
  $("#productDialogName").val((node.data && node.data.name) || "");
  $("#productDialog").dialog("open");
}

function openDialogForAdd() {
  editorState = {
    mode: "add",
    node: null,
    parentKey: "_"
  };

  $("#productDialog").dialog("option", "title", "Add step");
  $("#productDialogMode").val("add");
  $("#productDialogKey").val("");
  $("#productDialogParentKey").val("_");
  $("#productDialogNr").val("");
  $("#productDialogName").val("");
  $("#productDialog").dialog("open");
}

function syncDialogButtons() {
  var hasNr = String($("#productDialogNr").val() || "").trim().length > 0;
  var hasName = String($("#productDialogName").val() || "").trim().length > 0;
  var enabled = hasNr && hasName;
  var $save = $("#productDialog").dialog("widget").find(".ui-dialog-buttonpane button:contains('Save')");
  if ($save.length) {
    $save.button("option", "disabled", !enabled);
  }
}

function saveDialog() {
  var nr = String($("#productDialogNr").val() || "").trim();
  var name = String($("#productDialogName").val() || "").trim();
  if (!nr || !name) {
    return;
  }

  var data = { id: $("#productDialogKey").val(), nr: nr, name: name };
  var isEdit = $("#productDialogMode").val() === "edit";
  var targetUrl = url;
  var method = isEdit ? "PUT" : "POST";

  $.ajax(targetUrl, {
    type: method,
    data: data,
    success: function () {
      $("#productDialog").dialog("close");
      reloadTree();
    },
    error: function () {
      alert("ERROR: Request failed.");
    }
  });
}

function deleteNode(node) {
  if (!confirm("Delete '" + node.title + "'?")) {
    return;
  }

  $.ajax(url, {
    type: "DELETE",
    data: { id: node.key },
    success: function () {
      reloadTree();
    },
    error: function () {
      alert("ERROR: Request failed.");
    }
  });
}
