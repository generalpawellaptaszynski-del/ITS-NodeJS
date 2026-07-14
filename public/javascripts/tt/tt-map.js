var url_map = "/tt/map";
var DEFAULT_MAP_WIDTH = 1574;
var DEFAULT_MAP_HEIGHT = 491;
var MAP_MIN_X = -268;
var MAP_MAX_X = 4;
var MAP_MIN_Y = 2;
var MAP_MAX_Y = 478;
var MAP_RANGE_X = MAP_MAX_X - MAP_MIN_X;
var MAP_RANGE_Y = MAP_MAX_Y - MAP_MIN_Y;
var map_markers = [];
var activePopupMarker = null;

var icoActive = {
  iconUrl: "../images/map_active.png",
  iconSize: [19, 44],
  shadowUrl: "../images/map_shadow.png",
  shadowSize: [37, 22]
};
var icoSetup = {
  iconUrl: "../images/map_setup.png",
  iconSize: [19, 44],
  shadowUrl: "../images/map_shadow.png",
  shadowSize: [37, 22]
};
var icoRepair = {
  iconUrl: "../images/map_repair.png",
  iconSize: [19, 44],
  shadowUrl: "../images/map_shadow.png",
  shadowSize: [37, 22]
};
var icoInactive = {
  iconUrl: "../images/map_inactive.png",
  iconSize: [19, 44],
  shadowUrl: "../images/map_shadow.png",
  shadowSize: [37, 22]
};
var icoIssue = {
  iconUrl: "../images/map_issue.png",
  iconSize: [19, 44],
  shadowUrl: "../images/map_shadow.png",
  shadowSize: [37, 22]
};

var map = createMapSurface();

$(function () {
  map.ensure();
  $(window).on("resize", function () {
    map.resize();
    refreshAllMarkerPositions();
  });
});

function createMapSurface() {
  var $board = null;
  var $background = null;
  var $layer = null;
  var config = readBoardConfig();
  var aspectRatio = config.width / config.height;

  function readBoardConfig() {
    var width = DEFAULT_MAP_WIDTH;
    var height = DEFAULT_MAP_HEIGHT;

    if ($board && $board.length) {
      var boardWidth = Number($board.data("mapWidth"));
      var boardHeight = Number($board.data("mapHeight"));

      if (isFinite(boardWidth) && boardWidth > 0) {
        width = boardWidth;
      }
      if (isFinite(boardHeight) && boardHeight > 0) {
        height = boardHeight;
      }
    }

    return {
      width: width,
      height: height,
      minX: MAP_MIN_X,
      maxX: MAP_MAX_X,
      minY: MAP_MIN_Y,
      maxY: MAP_MAX_Y,
      rangeX: MAP_RANGE_X,
      rangeY: MAP_RANGE_Y
    };
  }

  function ensure() {
    if ($board && $board.length) {
      return;
    }

    $board = $("#map");
    if (!$board.length) {
      return;
    }

    var boardImage = String($board.data("mapImage") || "../images/images-user/map.jpg");
    config = readBoardConfig();
    $board.closest("#main-content").addClass("tt-map-main-content");
    $board.empty().addClass("tt-map-board");
    $background = $("<img>", {
      class: "tt-map-background",
      alt: "Workplace map"
    });
    $background.on("load", function () {
      var image = $background[0];
      if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
        setBoardAspect(image.naturalWidth, image.naturalHeight);
        updateBoardSize();
        refreshAllMarkerPositions();
      }
    });
    $background.attr("src", boardImage);
    $layer = $("<div>", {
      class: "tt-map-layer"
    });
    $board.append($background, $layer);
    $board.on("click", function (e) {
      if ($(e.target).closest(".tt-map-marker").length === 0) {
        closeAllPopups();
      }
    });
    setBoardAspect(config.width, config.height);
    updateBoardSize();
  }

  function setBoardAspect(width, height) {
    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
      return;
    }
    aspectRatio = width / height;
    if ($board && $board.length) {
      $board.css({
        "--tt-map-aspect": width + " / " + height,
        "--tt-map-ratio": aspectRatio
      });
    }
  }

  function updateBoardSize() {
    if (!$board || !$board.length) {
      return;
    }

    var rect = $board[0].getBoundingClientRect();
    var viewportWidth = $(window).width() || DEFAULT_MAP_WIDTH;
    var viewportHeight = $(window).height() || DEFAULT_MAP_HEIGHT;
    var availableWidth = Math.max(240, viewportWidth - rect.left - 16);
    var maxHeight = Math.max(240, viewportHeight - rect.top - 16);
    var width = Math.min(availableWidth, maxHeight * aspectRatio);

    $board.css({
      "--tt-map-max-height": Math.floor(maxHeight) + "px",
      "width": Math.floor(Math.max(width, 0)) + "px"
    });
  }

  function getBoard() {
    ensure();
    return $board;
  }

  function getLayer() {
    ensure();
    return $layer;
  }

  function getConfig() {
    ensure();
    return config;
  }

  function getStorageMode() {
    ensure();
    return "corner-calibrated";
  }

  function setStorageMode(mode) {
    ensure();
    return mode;
  }

  function detectStorageMode(rows) {
    ensure();
    return "corner-calibrated";
  }

  function mouseEventToLatLng(event) {
    ensure();
    var board = $board && $board[0];
    if (!board) {
      return { lat: 0, lng: 0 };
    }

    var rect = board.getBoundingClientRect();
    var nativeEvent = event && (event.originalEvent || event);
    var clientX = 0;
    var clientY = 0;

    if (nativeEvent && nativeEvent.clientX != null) {
      clientX = nativeEvent.clientX;
      clientY = nativeEvent.clientY;
    } else if (nativeEvent && nativeEvent.pageX != null) {
      clientX = nativeEvent.pageX - window.pageXOffset;
      clientY = nativeEvent.pageY - window.pageYOffset;
    }

    var cfg = getConfig();
    var percentX = (clientX - rect.left) / Math.max(rect.width, 1);
    var percentY = (clientY - rect.top) / Math.max(rect.height, 1);

    return {
      lat: clamp(cfg.maxX - (percentY * cfg.rangeX), cfg.minX, cfg.maxX),
      lng: clamp(cfg.minY + (percentX * cfg.rangeY), cfg.minY, cfg.maxY)
    };
  }

  function closeAllPopups() {
    map_markers.forEach(function (marker) {
      if (marker && typeof marker.closePopup === "function") {
        marker.closePopup();
      }
    });
  }

  return {
    ensure: ensure,
    getBoard: getBoard,
    getLayer: getLayer,
    getConfig: getConfig,
    getStorageMode: getStorageMode,
    setStorageMode: setStorageMode,
    detectStorageMode: detectStorageMode,
    mouseEventToLatLng: mouseEventToLatLng,
    closePopups: closeAllPopups,
    resize: updateBoardSize
  };
}

function mapRefresh(callback) {
  map.ensure();

  $.ajax({
    type: "GET",
    url: url_map,
    cache: false,
    success: function (data) {
      var liveMarkers = {};
      var cfg = map.getConfig();

      (data || []).forEach(function (row) {
        var markerId = row.id;
        var marker = map_markers[markerId];

        if (typeof marker !== "object") {
          marker = map_markers[markerId] = createMarker(row);
        }

        marker.setLatLng([
          Number(row && row.mapX) || 0,
          Number(row && row.mapY) || 0
        ]);
        marker.setIcon(chooseIcon(row));
        marker.bindPopup();
        marker.bindTooltip();
        marker.getPopup().setContent(buildPopupContent(row));
        marker.getTooltip().setContent(row.step || "");
        marker.data = row;

        liveMarkers[markerId] = true;
      });

      map_markers.forEach(function (marker, markerId) {
        if (typeof marker === "object" && !liveMarkers[markerId]) {
          marker.closePopup();
          marker.remove();
          delete map_markers[markerId];
        }
      });

      if (typeof callback === "function") {
        callback();
      }

      $("#curr-time").text(new Date().toLocaleTimeString());
      $("#map-error").text("");
    },
    error: function (xhr, status, error) {
      $("#map-error").text("ERROR: " + error + "\n" + xhr.responseText);
    }
  });
}

function createMarker(row) {
  map.ensure();

  var markerKey = String(row && row.id != null ? row.id : Math.random()).replace(/[^A-Za-z0-9_-]/g, "");
  var dragNamespace = ".ttMapMarkerDrag" + markerKey;
  var $marker = $("<button>", {
    type: "button",
    class: "tt-map-marker",
    title: row && row.step ? row.step : ""
  });
  var $shadow = $("<img>", {
    class: "tt-map-marker-shadow",
    alt: ""
  });
  var $icon = $("<img>", {
    class: "tt-map-marker-icon",
    alt: ""
  });
  var $tooltip = $("<div>", {
    class: "tt-map-tooltip"
  });
  var $popup = $("<div>", {
    class: "tt-map-popup"
  });
  var state = {
    lat: 0,
    lng: 0,
    icon: null,
    popupContent: "",
    tooltipContent: "",
    listeners: {},
    draggingEnabled: false,
    draggingActive: false,
    dragMoved: false,
    suppressNextClick: false
  };

  $marker.append($shadow, $icon, $tooltip, $popup);
  map.getLayer().append($marker);

  $marker.on("mouseenter", function () {
    if (state.tooltipContent) {
      $tooltip.addClass("open");
    }
  });

  $marker.on("mouseleave", function () {
    $tooltip.removeClass("open");
  });

  $marker.on("click", function (e) {
    if (state.suppressNextClick) {
      state.suppressNextClick = false;
      return;
    }

    fireListeners("preclick", e);
    api.openPopup();
    e.preventDefault();
    e.stopPropagation();
  });

  $marker.on("contextmenu", function (e) {
    e.preventDefault();
    fireListeners("contextmenu", e);
  });

  function fireListeners(eventName, event) {
    var handlers = state.listeners[eventName] || [];
    handlers.forEach(function (handler) {
      handler.call(api, event);
    });
  }

  function refreshPosition() {
    map.ensure();
    var cfg = map.getConfig();
    if (!cfg) {
      return api;
    }

    var left;
    var top;

    left = ((state.lng - cfg.minY) / Math.max(cfg.rangeY, 1)) * 100;
    top = ((cfg.maxX - state.lat) / Math.max(cfg.rangeX, 1)) * 100;
    $marker.css({
      left: left + "%",
      top: top + "%"
    });

    return api;
  }

  function setIcon(icon) {
    state.icon = icon || {};
    var iconSize = state.icon.iconSize || [19, 44];
    var shadowSize = state.icon.shadowSize || [37, 22];

    $marker.css({
      width: iconSize[0] + "px",
      height: iconSize[1] + "px"
    });

    $icon.attr("src", state.icon.iconUrl || "")
      .css({
        width: iconSize[0] + "px",
        height: iconSize[1] + "px"
      });

    if (state.icon.shadowUrl) {
      $shadow.attr("src", state.icon.shadowUrl)
        .show()
        .css({
          width: shadowSize[0] + "px",
          height: shadowSize[1] + "px"
        });
    } else {
      $shadow.hide();
    }

    refreshPosition();
    return api;
  }

  function setLatLng(latlng) {
    var cfg = map.getConfig();
    state.lat = clamp(Number(latlng && latlng[0]) || 0, cfg.minX, cfg.maxX);
    state.lng = clamp(Number(latlng && latlng[1]) || 0, cfg.minY, cfg.maxY);
    refreshPosition();
    return api;
  }

  function setStorageMode(mode) {
    refreshPosition();
    return api;
  }

  function setPopupContent(content) {
    state.popupContent = String(content || "");
    $popup.html(state.popupContent);
    return popupApi;
  }

  function setTooltipContent(content) {
    state.tooltipContent = String(content || "");
    $tooltip.text(state.tooltipContent);
    $marker.attr("title", state.tooltipContent);
    return tooltipApi;
  }

  function openPopup() {
    if (!state.popupContent.length) {
      return api;
    }

    map.closePopups();
    $popup.addClass("open");
    $marker.addClass("open");
    activePopupMarker = api;
    return api;
  }

  function closePopup() {
    $popup.removeClass("open");
    $marker.removeClass("open");
    if (activePopupMarker === api) {
      activePopupMarker = null;
    }
    return api;
  }

  function removeMarker() {
    closePopup();
    $(document).off(dragNamespace);
    if ($marker.data("ui-draggable")) {
      try {
        $marker.draggable("destroy");
      } catch (err) {}
    }
    $marker.remove();
    return api;
  }

  function on(eventName, handler) {
    if (!state.listeners[eventName]) {
      state.listeners[eventName] = [];
    }
    state.listeners[eventName].push(handler);
    return api;
  }

  function enableDragging() {
    if (state.draggingEnabled) {
      return api;
    }

    state.draggingEnabled = true;
    $marker.addClass("draggable-enabled");
    $marker.on("mousedown" + dragNamespace + " touchstart" + dragNamespace, startDrag);

    return api;
  }

  function startDrag(event) {
    if (event.type === "mousedown" && event.which !== 1) {
      return;
    }

    var board = map.getBoard()[0];
    var pointer = getPointerClient(event);
    if (!board || !pointer) {
      return;
    }

    var cfg = map.getConfig();
    var rect = board.getBoundingClientRect();
    var anchorX = ((state.lng - cfg.minY) / Math.max(cfg.rangeY, 1)) * rect.width;
    var anchorY = ((cfg.maxX - state.lat) / Math.max(cfg.rangeX, 1)) * rect.height;
    var offsetX = pointer.clientX - (rect.left + anchorX);
    var offsetY = pointer.clientY - (rect.top + anchorY);

    state.draggingActive = true;
    state.dragMoved = false;
    closePopup();
    $marker.addClass("dragging");
    $(document)
      .on("mousemove" + dragNamespace + " touchmove" + dragNamespace, function (moveEvent) {
        dragMove(moveEvent, offsetX, offsetY);
      })
      .on("mouseup" + dragNamespace + " touchend" + dragNamespace + " touchcancel" + dragNamespace, stopDrag);

    event.preventDefault();
    event.stopPropagation();
  }

  function dragMove(event, offsetX, offsetY) {
    var board = map.getBoard()[0];
    var pointer = getPointerClient(event);
    if (!state.draggingActive || !board || !pointer) {
      return;
    }

    var cfg = map.getConfig();
    var rect = board.getBoundingClientRect();
    var anchorX = clamp(pointer.clientX - rect.left - offsetX, 0, rect.width);
    var anchorY = clamp(pointer.clientY - rect.top - offsetY, 0, rect.height);
    var percentX = anchorX / Math.max(rect.width, 1);
    var percentY = anchorY / Math.max(rect.height, 1);

    state.lng = clamp(cfg.minY + (percentX * cfg.rangeY), cfg.minY, cfg.maxY);
    state.lat = clamp(cfg.maxX - (percentY * cfg.rangeX), cfg.minX, cfg.maxX);
    state.dragMoved = true;
    refreshPosition();

    event.preventDefault();
    event.stopPropagation();
  }

  function stopDrag(event) {
    if (!state.draggingActive) {
      return;
    }

    state.draggingActive = false;
    $(document).off(dragNamespace);
    $marker.removeClass("dragging");

    if (state.dragMoved) {
      state.suppressNextClick = true;
      fireListeners("dragend", {
        target: {
          _latlng: {
            lat: state.lat,
            lng: state.lng
          }
        }
      });
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function getPointerClient(event) {
    var original = event && (event.originalEvent || event);
    var touch = original && original.touches && original.touches.length ? original.touches[0] : null;
    var changedTouch = original && original.changedTouches && original.changedTouches.length ? original.changedTouches[0] : null;
    var pointer = touch || changedTouch || original;

    if (!pointer || pointer.clientX == null || pointer.clientY == null) {
      return null;
    }

    return {
      clientX: pointer.clientX,
      clientY: pointer.clientY
    };
  }

  var popupApi = {
    setContent: setPopupContent
  };

  var tooltipApi = {
    setContent: setTooltipContent
  };

  var api = {
    data: row || null,
    setLatLng: setLatLng,
    setStorageMode: setStorageMode,
    update: refreshPosition,
    setIcon: setIcon,
    bindPopup: function () { return api; },
    bindTooltip: function () { return api; },
    getPopup: function () { return popupApi; },
    getTooltip: function () { return tooltipApi; },
    openPopup: openPopup,
    closePopup: closePopup,
    remove: removeMarker,
    on: on,
    dragging: {
      enable: enableDragging
    }
  };

  setLatLng([state.lat, state.lng]);
  return api;
}

function chooseIcon(row) {
  if (!row) {
    return icoInactive;
  }

  if (row.issue) {
    return icoIssue;
  }

  if (row.workers != null && row.hu) {
    if (Number(row.hu) === -2) {
      return icoRepair;
    }

    if (Number(row.hu) === -1) {
      return icoSetup;
    }

    return icoActive;
  }

  return icoInactive;
}

function buildPopupContent(row) {
  var lines = [];
  lines.push("<u><b>" + escapeHtml(row && row.name ? row.name : "") + "</b></u>");
  lines.push("<small>");
  lines.push("<br>&diams; terminal: " + escapeHtml(row && row.id != null ? String(row.id) : ""));
  lines.push("<br>&diams; " + escapeHtml(row && row.step ? row.step : ""));
  if (row && row.workers) {
    lines.push("<br>&diams; " + escapeHtml(row.workers));
  }
  if (row && row.hu) {
    lines.push("<br>&diams; " + escapeHtml(row.hu == -2 ? "REPAIR" : (row.hu == -1 ? "SETUP" : "N " + row.hu)));
  }
  lines.push("</small>");
  return lines.join("");
}

function refreshAllMarkerPositions() {
  map_markers.forEach(function (marker) {
    if (marker && typeof marker.update === "function") {
      marker.update();
    }
  });
}

function closeAllPopups() {
  map_markers.forEach(function (marker) {
    if (marker && typeof marker.closePopup === "function") {
      marker.closePopup();
    }
  });
}

function clamp(value, min, max) {
  if (isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
