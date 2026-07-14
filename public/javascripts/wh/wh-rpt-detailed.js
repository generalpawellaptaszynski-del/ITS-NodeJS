var url = "/wh/report";
var itemUrl = "/wh/tree-item";
var tree = null;
var hoverAjax = null;

$(function () {
  $('.clsFltrInput, .clsFltrSelect').on('change', changeFltr);
  $('#btnResetFltr').on('click', resetFltr);

  populateDropdown('#doc_grp',     url + "/values/wh_doc/grp");
  populateDropdown('#worker_grp',  url + "/values/worker/grp");
  populateDropdown('#item_grp',    url + "/values/wh_item/grp");
  populateDropdown('#item_vendor', url + "/values/wh_item/vendor");

  updateFilterBackground();
  tree = ITS_tree_view.initTree("#tree-report", treeOptions());
  tree.ready.then(expandLatestReportBranch);
  bindHoverPopup();
});

function treeOptions() {
  return {
    source: {
      url: url + "/detailed" + getFltr(),
      cache: false
    },
    autoCollapse: true,
    table: {
      indentation: 20,
      nodeColumnIdx: 1
    },
    columns: [
      {
        className: "td-price alignRight",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.price != null ? node.data.price : "");
        }
      },
      {
        className: "td-qty alignRight",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.qty != null ? node.data.qty : "");
        }
      }
    ]
  };
}

function reloadTree() {
  if (!tree) {
    return;
  }

  hideHoverPopup();
  tree.options.source.url = url + "/detailed" + getFltr();
  return tree.reload().then(expandLatestReportBranch);
}

function populateDropdown(dropdown_name, request_url) {
  var dropdown = $(dropdown_name);
  dropdown.empty()
          .append('<option selected="true" value="">... All values ...</option>')
          .prop('selectedIndex', 0);
  $.ajax({
    type: "GET",
    url: request_url,
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(data) {
    $.each(data, function (key, entry) {
      dropdown.append($('<option class="accent"></option>').attr('value', entry.value).text(entry.value));
    });
  });
}

function getFltr() {
  return ITS_tree_view.buildQueryFromSelectors(['.clsFltrInput', '.clsFltrSelect']);
}

function updateFilterBackground() {
  $(".clsFltrInput, .clsFltrSelect").each(function () {
    var val = $(this).val();
    var hasValue = val !== null && String(val).trim().length > 0;

    $(this)
      .closest("td, th, .clsFltrCell")
      .toggleClass("clsFltrActive", hasValue);
  });
}

function changeFltr() {
  updateFilterBackground();
  reloadTree();
}

function resetFltr() {
  $('.clsFltrInput, .clsFltrSelect').val("");
  updateFilterBackground();
  reloadTree();
}

function expandLatestReportBranch() {
  if (!tree) {
    return $.Deferred().resolve().promise();
  }

  return expandLastChild(null)
    .then(function (yearNode) {
      return yearNode ? expandLastChild(yearNode) : null;
    })
    .then(function (monthNode) {
      return monthNode ? expandLastChild(monthNode) : null;
    })
    .then(function (dayNode) {
      if (dayNode) {
        scrollReportTreeToNode(dayNode);
      }
      return dayNode;
    });
}

function expandLastChild(parentNode) {
  var children = parentNode ? parentNode.children : tree.rootNodes;
  var node = children && children.length ? children[children.length - 1] : null;

  if (!node) {
    return $.Deferred().resolve(null).promise();
  }

  return tree.expandNode(node);
}

function scrollReportTreeToNode(node) {
  window.setTimeout(function () {
    var $row = $('#tree-report tbody tr[data-key="' + node.key + '"][data-level="' + node.level + '"]');
    var container = $('.wh-tree-scroll').has($row).get(0);

    if (!$row.length || !container) {
      return;
    }

    var rowRect = $row.get(0).getBoundingClientRect();
    var containerRect = container.getBoundingClientRect();
    container.scrollTop += rowRect.top - containerRect.top - 8;
  }, 0);
}

function showHoverPopup(itemId, x, y) {
  if (!itemId || itemId === "undefined") return;

  if (hoverAjax) hoverAjax.abort();

  hoverAjax = $.getJSON(itemUrl + "/item/" + itemId)
    .done(function (data) {
      $("#hp_name").text(data.name || "");
      $("#hp_group").text(data.group || data.grp || "");
      $("#hp_vendor").text(data.vendor || "");
      $("#hp_minQty").text(data.minQty || "");
      $("#hp_nr").text(data.itemNo || "");
      $("#hp_price").text(data.price || "");
      $("#hp_storage").text(data.nr || "");

      if (data.img) {
        $("#hp_preview")
          .attr("src", "data:image/jpeg;base64," + data.img)
          .show();
      } else {
        $("#hp_preview").hide();
      }

      var $p = $("#hoverPopup");
      var left = x + 10;
      var top = y + 10;
      var pw = $p.outerWidth();
      var ph = $p.outerHeight();
      var winW = $(window).width();
      var winH = $(window).height();

      if (left + pw + 10 > winW) left = winW - pw - 10;
      if (top + ph + 10 > winH) top = winH - ph - 10;
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      $p.css({ left: left, top: top }).addClass("show").show();
    });
}

function hideHoverPopup() {
  if (hoverAjax) hoverAjax.abort();
  hoverAjax = null;
  $("#hoverPopup").removeClass("show").hide();
}

function bindHoverPopup() {
  var timers = new WeakMap();

  $("#tree-report").on("mouseenter", "tr.its-tree-node", function (e) {
    var node = $(this).data("itsTreeNode");
    if (!node || node.folder) return;

    var itemId = String(node.key).split("/").pop();
    var startX = e.pageX;
    var startY = e.pageY;
    var timer = setTimeout(function () {
      showHoverPopup(itemId, startX, startY);
    }, 1000);

    timers.set(this, timer);
  });

  $("#tree-report").on("mouseleave", "tr.its-tree-node", function () {
    var t = timers.get(this);
    if (t) clearTimeout(t);
    timers.delete(this);
    hideHoverPopup();
  });

  $(document).on("mousemove", function (e) {
    var $p = $("#hoverPopup");
    if (!$p.is(":visible")) return;
    var o = $p.offset();
    if (!o) return;

    if (e.pageX < o.left || e.pageX > o.left + $p.outerWidth() ||
        e.pageY < o.top || e.pageY > o.top + $p.outerHeight()) {
      hideHoverPopup();
    }
  });
}
