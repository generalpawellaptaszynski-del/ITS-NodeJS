var url = "/tt/map";
var placeTree = null;
var stepLookup = {};
var currentFilterKey = "";
var suppressNextFilterBlurCommit = false;
var placeDialogState = {
  node: null
};
var idmarker = 0;
var in_team = false;
var menu_items = {
  del: { name: "Disconnect", icon: "delete" }
};

$(function () {
  loadSteps().always(function () {
    currentFilterKey = buildFilterKey();

    initDialog();
    bindFilters();
    bindActions();
    bindContextMenu();
    updateFilterBackground();

    placeTree = ITS_tree_view.initTree("#tree-places", treeOptions());
    mapRefresh(afterMapRefresh);
  });
});

function loadSteps() {
  var $filterSelect = $("#fltr-idstep");
  var $dialogSelect = $("#place_step");

  stepLookup = {};
  $filterSelect.empty().append($("<option></option>").attr("value", "").text("All steps"));
  $dialogSelect.empty().append($("<option></option>").attr("value", "").text("Select step"));

  return $.ajax({
    type: "GET",
    url: url + "/steps",
    cache: false,
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  }).done(function (steps) {
    (steps || []).forEach(function (step) {
      var key = String(step && step.id != null ? step.id : "");
      var label = String(step && step.nr != null ? step.nr : "") + " - " + String(step && step.name != null ? step.name : "");
      if (!key.length) {
        return;
      }

      stepLookup[key] = label;
      $filterSelect.append($("<option></option>").attr("value", key).text(label));
      $dialogSelect.append($("<option></option>").attr("value", key).text(label));
    });
  });
}

function bindFilters() {
  $("#fltr-id, #fltr-name")
    .on("input", function () {
      updateFilterBackground();
      scheduleFilterCommit();
    })
    .on("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $(this).blur();
      }
    })
    .on("blur", function () {
      if (suppressNextFilterBlurCommit) {
        suppressNextFilterBlurCommit = false;
        return;
      }
      commitFilter(false);
    });

  $("#fltr-idstep").on("change", function () {
    updateFilterBackground();
    commitFilter(true);
  });

  $("#btnResetFltr").on("mousedown", function () {
    suppressNextFilterBlurCommit = true;
  });

  $("#btnResetFltr").on("click", function () {
    $("#fltr-id").val("");
    $("#fltr-name").val("");
    $("#fltr-idstep").val("");
    updateFilterBackground();
    commitFilter(true);
  });
}

function bindActions() {
  $("#btn-refresh").on("click", function () {
    mapRefreshAll();
  });

  $("#fileMap").on("change", function () {
    var location = window.location.pathname;
    var formData = new FormData($("#frmMapUpload")[0]);
    $.ajax({
      url: "/upload/map",
      type: "POST",
      data: formData,
      mimeType: "multipart/form-data",
      contentType: false,
      cache: false,
      processData: false,
      success: function () {
        window.location.pathname = location;
      },
      error: function (xhr, status, error) {
        alert("Map upload failed: " + (error || status) + "\n" + (xhr.responseText || ""));
      }
    });
  });
  $("#fileDevices").on("change", function () {
    var location = window.location.pathname;
    var formData = new FormData($("#frmDevicesUpload")[0]);
    $.ajax({
      url: "/upload/devices",
      type: "POST",
      data: formData,
      mimeType: "multipart/form-data",
      contentType: false,
      cache: false,
      processData: false,
      success: function () {
        window.location.pathname = location;
      },
      error: function (jqXHR, textStatus, errorThrown) {
        alert("Error: " + jqXHR + " " + textStatus + " " + errorThrown);
      }
    });
  });
}

function initDialog() {
  $("#placeDialog").dialog({
    appendTo: "body",
    autoOpen: false,
    modal: true,
    width: 480,
    resizable: false,
    dialogClass: "tt-place-dialog",
    closeOnEscape: true,
    open: function () {
      var $widget = $(this).dialog("widget");
      $widget.addClass("tt-place-dialog").css("z-index", 6000);
      $(".ui-widget-overlay").last().css("z-index", 5990);
      syncPlaceDialogButtons();
    },
    buttons: [
      {
        text: "Save",
        class: "primary",
        click: function () {
          savePlace();
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

  $("#placeDialog input, #placeDialog select").on("input change", syncPlaceDialogButtons);
  $("#placeDialogForm").on("submit", function (e) {
    e.preventDefault();
    savePlace();
  });
}

function bindContextMenu() {
  $.contextMenu({
    selector: "#tree-places tbody tr.its-tree-node",
    build: function ($trigger) {
      var node = getNodeFromTrigger($trigger);
      if (!node || !node.data) {
        return false;
      }

      return {
        items: {
          edit: { name: "Edit", icon: "edit" },
          del: { name: "Delete", icon: "delete" }
        },
        callback: function (itemKey) {
          if (itemKey === "edit") {
            openEditPlaceDialog(node);
          } else if (itemKey === "del") {
            deletePlace(node);
          }
        }
      };
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
    columns: [
      {
        className: "td-step",
        render: function ($cell, node) {
          var stepKey = String(node.data && node.data.idstep != null ? node.data.idstep : "");
          $cell.text(stepLookup[stepKey] || "");
        }
      }
    ],
    onNodeClick: function (node) {
      if (node && node.data && node.data.id != null && typeof map_markers !== "undefined") {
        var marker = map_markers[node.data.id];
        if (marker) {
          marker.openPopup();
        }
      }
    },
    renderColumns: function (_, ctx) {
      var node = ctx && ctx.node ? ctx.node : null;
      var $row = ctx && ctx.row ? ctx.row : null;
      if (!node || !$row) {
        return;
      }

      $row.attr("data-node-type", "place");
      $row.toggleClass("place-connected", !!(node.data && node.data.connected));

      $row.find(".its-tree-nr").text(node.data && node.data.id != null ? node.data.id : "");
      $row.find(".its-tree-name").text(node.data && node.data.name ? node.data.name : "");

      var $toggleCell = $row.find(".its-tree-toggle-cell");
      $toggleCell.find(".its-tree-icon").remove();

      if (node.data && !node.data.connected) {
        if (!$toggleCell.find(".place-dragger").length) {
          $toggleCell.append(
            '<img class="grd-img draggable place-dragger" ' +
            'id="dev' + String(node.data.id == null ? "" : node.data.id) + '" ' +
            'src="../images/map_undefined.png" alt="Drag to map" title="Drag to map">'
          );
        }
      } else if (!$toggleCell.find(".place-dragger-empty").length) {
        $toggleCell.append('<span class="place-dragger-empty"></span>');
      }
    },
    onRender: function () {
      bindPlaceDraggables();
    }
  };
}

function bindPlaceDraggables() {
  $("#tree-places .place-dragger").draggable({ helper: "clone" });
}

function buildTreeUrl() {
  return url + "/table" + buildFilterQuery();
}

function buildFilterQuery() {
  var parts = [];
  var id = String($("#fltr-id").val() || "").trim();
  var name = String($("#fltr-name").val() || "").trim();
  var idstep = String($("#fltr-idstep").val() || "").trim();

  if (id.length) {
    parts.push("id=" + encodeURIComponent(id));
  }
  if (name.length) {
    parts.push("name=" + encodeURIComponent(name));
  }
  if (idstep.length) {
    parts.push("idstep=" + encodeURIComponent(idstep));
  }

  return parts.length ? "?" + parts.join("&") : "";
}

function buildFilterKey() {
  return [
    String($("#fltr-id").val() || "").trim(),
    String($("#fltr-name").val() || "").trim(),
    String($("#fltr-idstep").val() || "").trim()
  ].join("/");
}

function updateFilterBackground() {
  $("#fltr-id, #fltr-name, #fltr-idstep").each(function () {
    var hasValue = String($(this).val() || "").trim().length > 0;
    $(this).toggleClass("accent", hasValue);
  });
}

function commitFilter(force) {
  var filterKey = buildFilterKey();
  updateFilterBackground();

  if (!force && filterKey === currentFilterKey) {
    return;
  }

  currentFilterKey = filterKey;
  refreshPlaces();
}

var filterCommitTimer = null;
function scheduleFilterCommit() {
  clearTimeout(filterCommitTimer);
  filterCommitTimer = setTimeout(function () {
    commitFilter(false);
  }, 300);
}

function refreshPlaces() {
  if (!placeTree) {
    return;
  }

  placeTree.options.source.url = buildTreeUrl();
  placeTree.reload();
}

function mapRefreshAll() {
  refreshPlaces();
  mapRefresh(afterMapRefresh);
}

function openEditPlaceDialog(node) {
  if (!node || !node.data) {
    return;
  }

  placeDialogState.node = node.data;
  $("#place_id").val(node.data.id != null ? node.data.id : "");
  $("#place_name").val(node.data.name || "");
  $("#place_step").val(String(node.data.idstep != null ? node.data.idstep : ""));
  $("#placeDialog").dialog("option", "title", "Edit workplace " + node.data.id + " - " + (node.data.name || ""));
  $("#placeDialog").dialog("open");
}

function savePlace() {
  var id = String($("#place_id").val() || "").trim();
  var name = String($("#place_name").val() || "").trim();
  var idstep = String($("#place_step").val() || "").trim();

  if (!id || !name || !idstep) {
    return;
  }

  $.ajax({
    type: "PUT",
    url: url,
    data: {
      id: id,
      name: name,
      idstep: idstep
    },
    cache: false,
    success: function () {
      $("#placeDialog").dialog("close");
      mapRefreshAll();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function deletePlace(node) {
  if (!node || !node.data) {
    return;
  }

  var label = String(node.data.id || "") + " - " + String(node.data.name || "");
  if (!confirm("Delete '" + label + "'?")) {
    return;
  }

  $.ajax({
    type: "DELETE",
    url: url,
    data: {
      id: node.data.id
    },
    cache: false,
    success: function () {
      mapRefreshAll();
    },
    error: function (xhr, status, error) {
      alert(error + "\n" + xhr.responseText);
    }
  });
}

function syncPlaceDialogButtons() {
  var hasName = String($("#place_name").val() || "").trim().length > 0;
  var hasStep = String($("#place_step").val() || "").trim().length > 0;
  var enabled = hasName && hasStep;

  $("#placeDialog").dialog("widget").find(".ui-dialog-buttonpane button:contains('Save')")
    .prop("disabled", !enabled)
    .css({
      opacity: enabled ? 1 : 0.6,
      cursor: enabled ? "pointer" : "not-allowed"
    });
}

function getNodeFromTrigger($trigger) {
  var $row = $trigger.closest("tr.its-tree-node");
  if (!$row.length) {
    return null;
  }
  return $row.data("itsTreeNode") || null;
}

/* Refresh the map and make it editable */
function afterMapRefresh() {
  map_markers.forEach(function (marker, id) {
    if (typeof marker === "object") {
      if (marker.__ttAdminBindingsReady) {
        return;
      }
      marker.__ttAdminBindingsReady = true;

      marker.dragging.enable();
      marker.on("dragend", function (event) {
        $.ajax({
          type: "PUT",
          url: url + "/" + id,
          data: { mapX: event.target._latlng.lat, mapY: event.target._latlng.lng },
          cache: false,
          success: function () {
            mapRefreshAll();
          },
          error: function (xhr, status, error) {
            alert(error + "\n" + xhr.responseText);
          }
        });
      });

      marker.on("contextmenu", function () {
        idmarker = id;
      });

      marker.on("preclick", function () {
        if (in_team && id !== idmarker) {
          in_team = false;
          $.ajax({
            type: "PUT",
            url: url + "/team/" + idmarker + "/" + id,
            cache: false,
            success: function () {
              mapRefreshAll();
            },
            error: function (xhr, status, error) {
              alert(error + "\n" + xhr.responseText);
            }
          });
        }
      });
    }
  });
}

/* Context menu for markers */
$(document).ready(function () {
  $.contextMenu({
    selector: ".tt-map-marker",
    callback: function (key) {
      if (key === "del" && confirm("Disconnect it?")) {
        $.ajax({
          type: "DELETE",
          url: url + "/" + idmarker,
          cache: false,
          success: function () {
            mapRefreshAll();
          },
          error: function (xhr, status, error) {
            alert(error + "\n" + xhr.responseText);
          }
        });
      }
    },
    items: menu_items
  });

  $("#map").droppable({
    accept: ".draggable",
    drop: function (event, ui) {
      var point = map.mouseEventToLatLng(event);
      $.ajax({
        type: "PUT",
        url: url + "/" + ui.draggable.prop("id").substring(3),
        data: { mapX: point.lat, mapY: point.lng },
        cache: false,
        success: function () {
          mapRefreshAll();
        },
        error: function (xhr, status, error) {
          alert(error + "\n" + xhr.responseText);
        }
      });
    }
  });
});

function synchronizePlaces() {
  alert("synchronizePlaces");
}
