var tree = null;
var ORDER2_MAX_LENGTH = 100;

$(function(){ 

  // Populate dropdowns
  let ddlGrp = $('#product-grp');
  ddlGrp.empty()
          .append('<option selected="true" disabled>...</option>')
          .prop('selectedIndex', 0);
  $.ajax({
    type: "GET",
    url: "/tt/product",
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(data) {
    $.each(data, function (key, entry) {
      ddlGrp.append($('<option></option>').attr('value', entry.key).text(entry.title));
    });
  });

  resetOrder();
  $('#order2').on('input', validateOrder2);
 
  // Create the result tree
  tree = ITS_tree_view.initTree("#tree-orders", treeOptions());
  tree.ready.then(expandLatestOrdersBranch);
});

function treeOptions() {
  return {
    source: {url: "/tt/hu/list/years", cache: false},
    autoCollapse: true,
    getChildUrl: function (node) {
      if (node.level === 0 || node.level === 1) {
        return "/tt/hu/list/" + node.key;
      }
      if (node.level === 2) {
        return "/tt/hu/orders/" + node.key;
      }
      if (node.level === 3) {
        return "/tt/hu/proc_lists/" + node.key;
      }
      return "/tt/hu/list/years/" + node.key;
    },
    onNodeDblClick: function (node) {
      if (node.level === 4) {
        showHU(node.key);
      } else if (node.level === 3) {
        showOrder(node.key);
      }
    },
    renderColumns: function (event, data) {
      var node = data.node;
      var $row = data.row;
      var $title = $row.find(".its-tree-nr");

      if ($row.data("rendered")) {
        return;
      }

      if (node.level === 3) {
        if (!node.data.duration) {
          $row.addClass("node-incomplete");
          var btnDel = $('<button type="button" class="lstBtnDel">Delete</button>');
          btnDel.on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            delOrder(node.key, node.title);
          });
          $title.append(btnDel);
          btnDel.hide();

          $row.hover(function () {
            btnDel.show();
          }, function () {
            btnDel.hide();
          });
        }

        if (node.data.duration) {
          var spnTime = $('<span class="badge badge-pill badge-info">' + node.data.duration + '</span>');
          $title.append(spnTime);
        }
      }

      if (node.level >= 4 && node.data.incomplete) {
        $row.addClass("node-incomplete");
      }

      $row.data("rendered", true);
    }
  };
}

// Select product-grp
$("#product-grp").on("change", function() {
  let ddlSgrp = $('#product-sgrp');
  ddlSgrp.empty()
          .append('<option selected="true" disabled>...</option>')
          .prop('selectedIndex', 0);
  $('#product').empty()
               .append('<option selected="true" disabled>...</option>')
               .prop('selectedIndex', 0)
               .prop('disabled', 'disabled');
  $.ajax({
    type: "GET",
    url: "/tt/product/" + this.value,
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(data) {
    $.each(data, function (key, entry) {
      ddlSgrp.append($('<option></option>').attr('value', entry.key).text(entry.title));
    });
    $("#product-sgrp")
      .prop('disabled', false)
      .focus();
  });
});

// Select product-sgrp
$("#product-sgrp").on("change", function() {
  let ddlProduct = $('#product');
  ddlProduct.empty()
            .append('<option selected="true" disabled>...</option>')
            .prop('selectedIndex', 0);
  $.ajax({
    type: "GET",
    url: "/tt/product/" + this.value,
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(data) {
    $.each(data, function (key, entry) {
      ddlProduct.append($('<option></option>').attr('value', entry.key).text(entry.title));
    });
    $("#product")
      .prop('disabled', false)
      .focus();
  });
});

// Quantity
$("#qty").on("change", function() {
  $('#qtyOnList').val($('#qty').val());
});

// Button btnAddOrder
$("#btnAddOrder").click(function() {
  if (!validateOrder2()) {
    $("#order2").focus();
    return;
  }

  if ($("#order").val() && 
      $("#product").val() && 
      $("#qty").val() > 0 && 
      $("#qtyOnList").val() > 0 && 
      ($("#qty").val()/$("#qtyOnList").val() < 1000))
    $.ajax({
      type: "POST",
      url: "/tt/hu",
      data: newOrderData(),
      cache: false,
      error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
    }).done(function(data) {
      showOrder(data.idorder);
      resetOrder();
      reloadTree();
    });
  else 
    alert("Wrong data.");
});

function reloadTree() {
  if (!tree) {
    return;
  }

  return tree.reload().then(expandLatestOrdersBranch);
}

function newOrderData() {
  return {
    order: $("#order").val(), 
    order2: $("#order2").val(), 
    idproduct: $("#product").val().split("/")[2], // val = 1/2/3
    idproduct_grp: $("#product-grp").val(), 
    qty: $("#qty").val(), 
    qtyOnList: (($("#qtyOnList").val() > 0) ? $("#qtyOnList").val() : $("#qty").val()),
    dtarget: $("#dtarget").val()
  };
}

function expandLatestOrdersBranch() {
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
        scrollOrdersTreeToNode(dayNode);
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

function scrollOrdersTreeToNode(node) {
  window.setTimeout(function () {
    var $row = $('#tree-orders tbody tr[data-key="' + node.key + '"][data-level="' + node.level + '"]');
    var container = $('.tt-tree-scroll').has($row).get(0);

    if (!$row.length || !container) {
      return;
    }

    var rowRect = $row.get(0).getBoundingClientRect();
    var containerRect = container.getBoundingClientRect();
    container.scrollTop += rowRect.top - containerRect.top - 8;
  }, 0);
}

function validateOrder2() {
  var value = $("#order2").val() || "";
  var isTooLong = value.length > ORDER2_MAX_LENGTH;
  var message = "Reference/Tax Number must be 100 characters or less (" + value.length + "/" + ORDER2_MAX_LENGTH + ").";

  $("#order2")
    .toggleClass("is-invalid", isTooLong)
    .attr("aria-invalid", isTooLong ? "true" : "false");
  $("#order2-error")
    .text(isTooLong ? message : "")
    .toggle(isTooLong);

  return !isTooLong;
}

function delOrder(idorder, order) {
  if (confirm("Delete the order '" + order + "'?")) {
    $.ajax({
      type: "DELETE",
      url: "/tt/hu/" + idorder,
      cache: false,
      error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
    }).done(function(data) {
      reloadTree();
    });
  }
}

function resetOrder() {
  $('#order').val('');
  $('#order2').val('');
  validateOrder2();
  $('#dtarget').val('');
  $('#product-grp').prop('selectedIndex', 0);
  $('#product-sgrp').empty()
                    .append('<option selected="true" disabled>...</option>')
                    .prop('selectedIndex', 0)
                    .prop('disabled', 'disabled');
  $('#product').empty()
               .append('<option selected="true" disabled>...</option>')
               .prop('selectedIndex', 0)
               .prop('disabled', 'disabled');
  $('#qty').val('');
  $('#qtyOnList').val('');
}
