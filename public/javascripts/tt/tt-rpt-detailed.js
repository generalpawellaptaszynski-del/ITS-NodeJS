var url = "/tt/report";
var tree = null;

$(function () {
	  setDefaultDateFrom();
	  $('.clsFltrInput, .clsFltrSelect').on('change', changeFltr);
	  $('#hu').on('keydown', function (event) {
	    if (event.key !== 'Enter') {
	      return;
	    }
	    event.preventDefault();
	    var hu = Number($('#hu').val());
	    $('#hu').val('');
	    if (hu > 0) {
	      showHU(hu);
	    }
	  });
	  $('#btnResetFltr').on('click', resetFltr);

  $.ajax({
    type: "GET",
    url: url + "/dictionaries",
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(dictionaries) {
    populateDropdown('#idplace', dictionaries[0]);
    populateDropdown('#idstep', dictionaries[1]);
    populateDropdown('#idworker', dictionaries[2]);
    populateDropdown('#idproduct_grp', dictionaries[3]);

    updateFilterBackground();
    tree = ITS_tree_view.initTree("#tree-report", treeOptions());
  });
});

function treeOptions() {
  return {
    source: {
      url: url + "/detailed/tree" + getFltr(),
      cache: false
    },
    autoCollapse: true,
    table: {
      indentation: 20,
      nodeColumnIdx: 1
    },
    columns: [
      {
        className: "td-sec alignRight",
        render: function ($cell, node) {
          var sec = node.data && node.data.sec != null ? node.data.sec : "";
          $cell.text(sec);
        }
      },
      {
        className: "td-place",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.place ? node.data.place : "");
        }
      },
      {
        className: "td-step",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.step ? node.data.step : "");
        }
      },
      {
        className: "td-worker",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.worker ? node.data.worker : "");
        }
      },
      {
        className: "td-product",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.product_grp ? node.data.product_grp : "");
        }
      },
      {
        className: "td-hu alignRight",
        render: function ($cell, node) {
          $cell.text(node.data && node.data.hu != null ? node.data.hu : "");
        }
      }
    ],
    onNodeDblClick: function (node) {
      if (node.data && node.data.hu) {
        showHU(node.data.hu);
      }
    }
  };
}

function reloadTree() {
  if (!tree) {
    return;
  }

  tree.options.source.url = url + "/detailed/tree" + getFltr();
  tree.reload();
}

function setDefaultDateFrom() {
  var $dfrom = $('#dfrom');
  if (!$dfrom.length || String($dfrom.val() || '').trim().length > 0) {
    return;
  }

  var d = new Date();
  d.setDate(d.getDate() - 7);
  $dfrom.val(formatDateForInput(d));
}

function formatDateForInput(d) {
  var yyyy = d.getFullYear();
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return yyyy + '-' + mm + '-' + dd;
}

function populateDropdown(dropdown_name, rows) {
  var dropdown = $(dropdown_name);
  dropdown.empty()
          .append('<option selected="true" value="">... All values ...</option>')
          .prop('selectedIndex', 0);

  $.each(rows, function (key, entry) {
    dropdown.append($('<option class="accent"></option>').attr('value', entry.id).text(entry.fullname));
  });
}

function getFltr() {
	  return ITS_tree_view.buildQueryFromSelectors(['.clsFltrInput', '.clsFltrSelect']);
}

function updateFilterBackground() {
  $(".clsFltrInput, .clsFltrSelect").each(function () {
    var val = $(this).val();
    var hasValue = val !== null && String(val).trim().length > 0;
    $(this).toggleClass("accent", hasValue);
  });
}

function changeFltr() {
  updateFilterBackground();
  reloadTree();
}

function resetFltr() {
	  $('.clsFltrInput, .clsFltrSelect').val("");
	  setDefaultDateFrom();
	  updateFilterBackground();
	  reloadTree();
	}
