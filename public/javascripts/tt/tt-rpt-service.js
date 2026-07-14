var url = "/tt/report";
var tree = null;

$(function(){ 
  tree = ITS_tree_view.initTree("#tree-service", treeOptions());
  tree.ready.then(expandLatestServiceBranch);
});

function treeOptions() {
  return {
    source: {url: url + "/service", cache: false},
    autoCollapse: true,
    getChildUrl: function (node) {
      return url + "/service/" + node.key;
    },
    columns: [
      {
        className: "td-setup alignRight",
        render: function ($cell, node) {
          if (node.data && node.data.setup) {
            $cell.html('<span class="badge badge-pill badge-setup">' + Math.floor(node.data.setup / 60) + ' min</span>');
          } else {
            $cell.html('');
          }
        }
      },
      {
        className: "td-repair alignRight",
        render: function ($cell, node) {
          if (node.data && node.data.repair) {
            $cell.html('<span class="badge badge-pill badge-repair">' + Math.floor(node.data.repair / 60) + ' min</span>');
          } else {
            $cell.html('');
          }
        }
      }
    ]
  };
}

function expandLatestServiceBranch() {
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
        scrollServiceTreeToNode(dayNode);
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

function scrollServiceTreeToNode(node) {
  window.setTimeout(function () {
    var $row = $('#tree-service tbody tr[data-key="' + node.key + '"][data-level="' + node.level + '"]');
    var container = $('.tt-tree-scroll').has($row).get(0);

    if (!$row.length || !container) {
      return;
    }

    var rowRect = $row.get(0).getBoundingClientRect();
    var containerRect = container.getBoundingClientRect();
    container.scrollTop += rowRect.top - containerRect.top - 8;
  }, 0);
}
