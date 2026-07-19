var url = "/tt/product";
var tree = null;
var lastAppliedFilter = "";
var suppressNextFilterBlurCommit = false;
var editorState = {
  mode: "edit",
  node: null,
  parentKey: "_",
  kind: "group"
};

$(function () {
  lastAppliedFilter = getFltr();

  $("#btnResetFltr").on("click", function () {
    $("#product_name").val("");
    updateFilterBackground();
    commitFilter(true);
  });

  $("#btnResetFltr").on("mousedown", function () {
    suppressNextFilterBlurCommit = true;
  });

  $("#product_name")
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

  tree = ITS_tree_view.initTree("#tree-product-new", treeOptions());
  updateFilterBackground();

  $.contextMenu({
    selector: "#tree-product-new tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node) {
        return false;
      }

      var items = {
        edit: { name: "Edit", icon: "edit" }
      };

      if (node.folder) {
        var hasChildren = !!(node.loaded && node.children && node.children.length);
        if (!isFilteredFlatMode()) {
          if (node.level === 0) {
            items.add_group = { name: "Add subgroup", icon: "add" };
          }
          if (node.level === 1) {
            items.add_item = { name: "Add product", icon: "add" };
          }
        }
        if (!hasChildren) {
          items.del = { name: "Delete", icon: "delete" };
        }
      } else {
        items.del = { name: "Delete", icon: "delete" };
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
              openDialogForEdit(currentNode);
              break;
            case "add_group":
              openDialogForAdd("subgroup", currentNode);
              break;
            case "add_item":
              openDialogForAdd("product", currentNode);
              break;
            case "del":
              deleteNode(currentNode);
              break;
          }
        }
      };
    }
  });

  $("#btnAddProductGrpNew").on("click", function () {
    openDialogForAdd("group", null);
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
  return ITS_tree_view.buildQueryFromSelectors(["#product_name"]);
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

function isFilteredFlatMode() {
  return String(lastAppliedFilter || "").trim().length > 0;
}

function updateFilterBackground() {
  var $input = $("#product_name");
  var hasValue = String($input.val() || "").trim().length > 0;
  $input.toggleClass("clsFltrActive", hasValue);
}

function getNodeNrPath(node) {
  if (!node) {
    return "";
  }

  if (node.data && node.data.nrPath) {
    return String(node.data.nrPath);
  }

  var parts = [];
  var current = node;
  while (current) {
    var part = current.title != null ? String(current.title).trim() : "";
    if (part.length) {
      parts.unshift(part);
    }
    current = current.parent;
  }
  return parts.join("/");
}

function setDialogTitle(prefix, node, fallback) {
  var path = getNodeNrPath(node);
  var title = path ? (prefix + " " + path) : (fallback || prefix);
  $("#productDialog").dialog("option", "title", title);
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
    parentKey: null,
    kind: nodeUsesName(node) ? "subgroup" : (node.folder ? "group" : "product")
  };

  setDialogTitle("Edit", node, "Edit");
  $("#productDialogMode").val("edit");
  $("#productDialogKey").val(node.key);
  $("#productDialogParentKey").val("");
  $("#productDialogNr").val(node.title || "");
  $("#productDialogName").val((node.data && node.data.name) || "");
  updateDialogNameVisibility();
  $("#productDialog").dialog("open");
}

function openDialogForAdd(kind, parentNode) {
  var title = "Add group";
  var parentKey = "_";

  if (kind === "subgroup" && parentNode) {
    title = "Add subgroup";
    parentKey = parentNode.key + "/_";
    title = getNodeNrPath(parentNode) ? (title + " " + getNodeNrPath(parentNode)) : title;
  } else if (kind === "product" && parentNode) {
    title = "Add product";
    parentKey = parentNode.key + "/_";
    title = getNodeNrPath(parentNode) ? (title + " " + getNodeNrPath(parentNode)) : title;
  }

  editorState = {
    mode: "add",
    node: null,
    parentKey: parentKey,
    kind: kind
  };

  $("#productDialog").dialog("option", "title", title);
  $("#productDialogMode").val("add");
  $("#productDialogKey").val("");
  $("#productDialogParentKey").val(parentKey);
  $("#productDialogNr").val("");
  $("#productDialogName").val("");
  updateDialogNameVisibility();
  $("#productDialog").dialog("open");
}

function nodeUsesName(node) {
  return !!(node && node.folder && node.level === 1);
}

function dialogUsesName() {
  if (editorState.mode === "edit") {
    return nodeUsesName(editorState.node);
  }
  return editorState.kind === "subgroup";
}

function updateDialogNameVisibility() {
  var usesName = dialogUsesName();
  $("#productDialogNameLabel, #productDialogName").toggle(usesName);
  $("#productDialogName").prop("required", usesName);
}

function syncDialogButtons() {
  var hasNr = String($("#productDialogNr").val() || "").trim().length > 0;
  var hasName = String($("#productDialogName").val() || "").trim().length > 0;
  var enabled = hasNr && (!dialogUsesName() || hasName);
  var $save = $("#productDialog").dialog("widget").find(".ui-dialog-buttonpane button:contains('Save')");
  if ($save.length) {
    $save.button("option", "disabled", !enabled);
  }
}

function saveDialog() {
  var nr = String($("#productDialogNr").val() || "").trim();
  var name = String($("#productDialogName").val() || "").trim();
  var usesName = dialogUsesName();
  if (!nr || (usesName && !name)) {
    return;
  }

  var data = { nr: nr };
  if (usesName) {
    data.name = name;
  }
  var isEdit = $("#productDialogMode").val() === "edit";
  var targetUrl = isEdit ? (url + "/" + $("#productDialogKey").val()) : (url + "/" + $("#productDialogParentKey").val());
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
  if (node.folder) {
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
