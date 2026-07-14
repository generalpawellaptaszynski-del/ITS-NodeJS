var url = "/tt/process";
var tree = null;
var lastAppliedFilter = "";
var suppressNextFilterBlurCommit = false;
var stepMenu = null;
var stepMenuReady = false;
var editorState = {
  mode: "edit",
  node: null,
  parentKey: "_"
};

$(function () {
  lastAppliedFilter = getFltr();

  $("#btnResetFltr").on("click", function () {
    $("#process_name").val("");
    updateFilterBackground();
    commitFilter(true);
  });

  $("#btnResetFltr").on("mousedown", function () {
    suppressNextFilterBlurCommit = true;
  });

  $("#process_name")
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
          saveGroupDialog();
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
    saveGroupDialog();
  });

  tree = ITS_tree_view.initTree("#tree", treeOptions());
  updateFilterBackground();

  loadStepOptions().always(function () {
    initContextMenu();
  });

  $("#btnAddProductGrpNew").on("click", function () {
    openGroupDialogForAdd();
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
    },
    lazyLoad: function (event, data) {
      data.result = {
        url: url + "/" + data.node.key + lastAppliedFilter,
        cache: false
      };
    }
  };
}

function getFltr() {
  return ITS_tree_view.buildQueryFromSelectors(["#process_name"]);
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
  var $input = $("#process_name");
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

function loadStepOptions() {
  return $.ajax({
    type: "GET",
    url: url + "/steps",
    cache: false,
    success: function (data) {
      var options = {0: "..Select a step.."};
      $.each(data || [], function (key, entry) {
        options[entry.id] = entry.nr + " " + entry.name;
      });
      stepMenu = options;
      stepMenuReady = true;
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function initContextMenu() {
  $.contextMenu({
    selector: "#tree tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node) {
        return false;
      }

      var items = {
        edit: { name: node.folder ? "Edit group" : "Edit number", icon: "edit" },
        del: { name: "Delete", icon: "delete" }
      };

      if (node.folder && !isFilteredFlatMode() && stepMenuReady) {
        items.add_step = {
          name: "Add a step ...",
          icon: "add",
          items: {
            select: {
              type: "select",
              options: stepMenu,
              selected: 0,
              events: {
                change: function (e) {
                  var idstep = $(e.target).find(":selected").val();
                  $("#tree tr.its-tree-node").contextMenu("hide");
                  if (!idstep || idstep === "0") {
                    return;
                  }
                  var n = prompt("Number");
                  if (n > 0 && n != node.data.n) {
                    $.ajax(url + "/" + node.key + "/" + idstep + "/" + n, {
                      type: "POST",
                      error: function () {
                        alert("ERROR: Request failed.");
                      },
                      success: function () {
                        reloadTree();
                      }
                    });
                  }
                }
              }
            }
          }
        };
      }

      return {
        items: items,
        callback: function (itemKey, opt) {
          var currentNode = getNodeFromTrigger(opt.$trigger);
          if (!currentNode) {
            return;
          }

          switch (itemKey) {
            case "edit":
              if (currentNode.folder) {
                openGroupDialogForEdit(currentNode);
              } else {
                editAssignmentNumber(currentNode);
              }
              break;
            case "del":
              deleteNode(currentNode);
              break;
          }
        }
      };
    }
  });
}

function openGroupDialogForEdit(node) {
  editorState = {
    mode: "edit",
    node: node,
    parentKey: null
  };

  $("#productDialog").dialog("option", "title", "Edit group");
  $("#productDialogMode").val("edit");
  $("#productDialogKey").val(node.key);
  $("#productDialogParentKey").val("");
  $("#productDialogNr").val(node.title || "");
  $("#productDialogName").val((node.data && node.data.name) || "");
  $("#productDialog").dialog("open");
}

function openGroupDialogForAdd() {
  editorState = {
    mode: "add",
    node: null,
    parentKey: "_"
  };

  $("#productDialog").dialog("option", "title", "Add group");
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

function saveGroupDialog() {
  var nr = String($("#productDialogNr").val() || "").trim();
  var name = String($("#productDialogName").val() || "").trim();
  if (!nr || !name) {
    return;
  }

  var data = { nr: nr, name: name };
  var isEdit = $("#productDialogMode").val() === "edit";
  var targetUrl = isEdit ? (url + "/" + $("#productDialogKey").val()) : url;
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

function editAssignmentNumber(node) {
  var n = prompt("Number", node.data && node.data.n);
  if (n > 0 && n != (node.data && node.data.n)) {
    $.ajax(url + "/" + node.key + "/" + n, {
      type: "PUT",
      error: function () {
        alert("ERROR: Request failed.");
      },
      success: function () {
        reloadTree();
      }
    });
  }
}

function deleteNode(node) {
  if (node.folder) {
    if (node.loaded && node.children && node.children.length) {
      alert("This node cannot be deleted because child nodes exist.");
      return;
    }
    $.getJSON(url + "/" + node.key)
      .done(function (children) {
        if (children && children.length) {
          alert("This node cannot be deleted because child nodes exist.");
          return;
        }
        confirmAndDelete(node);
      })
      .fail(function () {
        alert("ERROR: Request failed.");
      });
    return;
  }

  confirmAndDelete(node);
}

function confirmAndDelete(node) {
  if (!confirm("Delete '" + node.title + "'?")) {
    return;
  }

  $.ajax(url + "/" + node.key, {
    type: "DELETE",
    success: function () {
      reloadTree();
    },
    error: function () {
      alert("ERROR: Request failed.");
    }
  });
}

function isFilteredFlatMode() {
  return String(lastAppliedFilter || "").trim().length > 0;
}
