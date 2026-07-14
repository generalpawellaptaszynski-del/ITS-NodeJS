(function (window, $) {
  if (!window || !window.jQuery) {
    return;
  }

  function buildQueryFromSelectors(selectors) {
    var parts = [];

    (selectors || []).forEach(function (selector) {
      $(selector).each(function () {
        var $el = $(this);
        var key = $el.attr('id');
        var val = $el.val();

        if (key && val !== null && String(val).trim().length > 0) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
        }
      });
    });

    return parts.length ? '?' + parts.join('&') : '';
  }

  function appendPathSegment(url, segment) {
    var parts = String(url || '').split('?');
    var base = parts[0].replace(/\/$/, '');
    var query = parts.length > 1 ? '?' + parts.slice(1).join('?') : '';
    if (/\/0$/.test(base)) {
      base = base.replace(/\/0$/, '');
    }

    return base + '/' + segment + query;
  }

  function getNodeCountLabel(node) {
    var data = node && node.data ? node.data : {};
    var raw = null;

    ['count', 'cnt', 'childCount', 'childrenCount', 'itemCount'].some(function (key) {
      if (data[key] !== null && typeof data[key] !== 'undefined' && String(data[key]).trim() !== '') {
        raw = data[key];
        return true;
      }
      return false;
    });

    if (raw === null && node && node.loaded && Array.isArray(node.children)) {
      raw = node.children.length;
    }

    if (raw === null) {
      return '';
    }

    if (data.countLabel !== null && typeof data.countLabel !== 'undefined') {
      return String(data.countLabel);
    }

    var count = parseInt(raw, 10);
    if (isFinite(count)) {
      return count + (count === 1 ? ' element' : ' elements');
    }

    return String(raw);
  }

  function applyGroupSummary($tr, node) {
    if (!node || !node.folder) {
      return;
    }

    $tr.addClass('its-tree-group-row');

    var $nameCell = $tr.find('.its-tree-name').first();
    if (!$nameCell.length || $nameCell.find('.its-tree-group-count, .worker-group-count').length) {
      return;
    }

    var countLabel = getNodeCountLabel(node);
    if (!countLabel) {
      return;
    }

    var label = $.trim($nameCell.text());
    $nameCell.empty()
      .append($('<span class="its-tree-group-label"></span>').text(label))
      .append($('<span class="its-tree-group-count"></span>').text(countLabel));
  }

  function TreeView(selector, options) {
    this.$tree = $(selector);
    this.options = $.extend(true, {
      source: { url: '', cache: false },
      table: { indentation: 20, nodeColumnIdx: 1 },
      autoCollapse: false
    }, options || {});
    this.$tbody = this.$tree.is('table') ? this.$tree.find('tbody') : this.$tree;
    if (!this.$tbody.length) {
      this.$tbody = this.$tree;
    }
    this.rootNodes = [];
    this.nodeByKey = {};
    this.loading = false;
  }

  TreeView.prototype.registerNode = function (node) {
    this.nodeByKey[String(node.key)] = node;
  };

  TreeView.prototype.normalizeNode = function (raw, level, parent) {
    var rawKey = raw.key != null ? raw.key : raw.id;
    var rawTitle = raw.title != null ? raw.title : (raw.nr != null ? raw.nr : raw.name);
    var node = {
      key: String(rawKey != null ? rawKey : ''),
      title: rawTitle != null ? String(rawTitle) : '',
      data: raw,
      folder: !!raw.folder,
      lazy: !!raw.lazy,
      loaded: Array.isArray(raw.children),
      expanded: !!raw.expanded,
      children: [],
      parent: parent || null,
      level: level || 0
    };

    if (Array.isArray(raw.children)) {
      var self = this;
      node.children = raw.children.map(function (child) {
        return self.normalizeNode(child, node.level + 1, node);
      });
    }

    this.registerNode(node);
    return node;
  };

  TreeView.prototype.loadChildren = function (node) {
    var self = this;
    var url = this.options.source && this.options.source.url ? this.options.source.url : '';
    var childUrl;

    if (node) {
      if (typeof self.options.getChildUrl === 'function') {
        childUrl = self.options.getChildUrl(node, url);
      } else {
        childUrl = appendPathSegment(url, node.key);
      }
    } else {
      childUrl = url;
    }

    return $.getJSON(childUrl).then(function (rows) {
      var level = node ? node.level + 1 : 0;
      var children = (rows || []).map(function (row) {
        return self.normalizeNode(row, level, node || null);
      });

      if (node) {
        node.children = children;
        node.loaded = true;
      } else {
        self.rootNodes = children;
      }

      return children;
    });
  };

  TreeView.prototype.renderNode = function (node) {
    var self = this;
    var indent = (self.options.table && self.options.table.indentation) || 20;
    var $tr = $('<tr class="its-tree-node"></tr>')
      .attr('data-key', node.key)
      .attr('data-level', node.level);
    var nodeType = node.data && node.data.node_type ? String(node.data.node_type) : "";

    if (nodeType) {
      $tr.attr('data-node-type', nodeType);
    }

    var $toggleCell = $('<td class="its-tree-toggle-cell"></td>');
    var $toggle = $('<span class="its-tree-toggle" aria-hidden="true"></span>');
    var $icon = $('<span class="its-tree-icon" aria-hidden="true"></span>');
    $toggleCell.css('padding-left', (node.level * indent) + 'px');

    $icon.addClass(node.folder ? 'folder' : 'item');

    if (node.folder) {
      $toggle.addClass(node.expanded ? 'expanded' : 'collapsed');
      $toggle.text(node.expanded ? '▾' : '▸');
      $toggle.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.toggleNode(node);
      });
    } else {
      $toggle.addClass('leaf').html('&nbsp;');
    }

    $toggleCell.append($toggle);
    $toggleCell.append($icon);
    $tr.append($toggleCell);

    $tr.append($('<td class="its-tree-nr"></td>').text(node.title || ''));
    $tr.append($('<td class="its-tree-name"></td>').text((node.data && node.data.name) || ''));

    if (Array.isArray(self.options.columns)) {
      self.options.columns.forEach(function (column) {
        var $cell = $('<td></td>');
        var className = column && column.className ? String(column.className) : '';

        if (className) {
          $cell.addClass(className);
        }

        if (column && typeof column.render === 'function') {
          column.render($cell, node, $tr, self);
        } else if (column && typeof column.text === 'function') {
          $cell.text(column.text(node, self));
        } else if (column && typeof column.text !== 'undefined') {
          $cell.text(column.text);
        }

        $tr.append($cell);
      });
    }

    $tr.data('itsTreeNode', node);
    $tr.on('dblclick', function (e) {
      if (self.options.onNodeDblClick) {
        self.options.onNodeDblClick(node, e);
      }
    });
    $tr.on('click', function () {
      if (self.options.onNodeClick) {
        self.options.onNodeClick(node);
      }
    });

    if (typeof self.options.renderColumns === 'function') {
      self.options.renderColumns(null, { node: node, row: $tr });
    }

    applyGroupSummary($tr, node);

    return $tr;
  };

  TreeView.prototype.render = function () {
    var self = this;
    var $rows = $();

    function appendNode(node) {
      $rows = $rows.add(self.renderNode(node));
      if (node.expanded && node.children && node.children.length) {
        node.children.forEach(appendNode);
      }
    }

    this.rootNodes.forEach(appendNode);
    this.$tbody.empty().append($rows);
    if (typeof self.options.onRender === 'function') {
      self.options.onRender(self);
    }
    return this;
  };

  TreeView.prototype.load = function () {
    var self = this;
    if (self.loading) {
      return $.Deferred().resolve(self).promise();
    }

    self.loading = true;
    self.nodeByKey = {};

    return self.loadChildren(null).then(function () {
      self.rootNodes.forEach(function (node) {
        node.parent = null;
        node.level = 0;
      });
      self.render();
      self.loading = false;
      return self;
    }, function (xhr) {
      self.loading = false;
      throw xhr;
    });
  };

  TreeView.prototype.reload = function () {
    this.ready = this.load();
    return this.ready;
  };

  TreeView.prototype.findNode = function (key) {
    return this.nodeByKey[String(key)] || null;
  };

  TreeView.prototype.toggleNode = function (node) {
    var self = this;
    if (!node.folder) {
      return;
    }

    if (node.expanded) {
      node.expanded = false;
      self.render();
      return;
    }

    self.expandNode(node);
  };

  TreeView.prototype.expandNode = function (node) {
    var self = this;

    if (!node || !node.folder) {
      return $.Deferred().resolve(node).promise();
    }

    var afterLoad = function () {
      if (self.options.autoCollapse) {
        var siblings = node.parent ? (node.parent.children || []) : self.rootNodes;
        siblings.forEach(function (sibling) {
          if (sibling !== node) {
            self.collapseDeep(sibling);
          }
        });
      }
      node.expanded = true;
      self.render();
      return node;
    };

    if (node.loaded) {
      return $.Deferred().resolve(afterLoad()).promise();
    }

    return this.loadChildren(node).then(afterLoad);
  };

  TreeView.prototype.collapseDeep = function (node) {
    node.expanded = false;
    (node.children || []).forEach(this.collapseDeep.bind(this));
  };

  TreeView.prototype.getRootNode = function () {
    return { children: this.rootNodes };
  };

  function initTree(selector, options) {
    var $tree = $(selector);
    var inst = new TreeView(selector, options);
    $tree.data('itsTreeView', inst);
    inst.ready = inst.load();
    return inst;
  }

  function reloadTree(selector, options) {
    var $tree = $(selector);
    var inst = $tree.data('itsTreeView');
    if (!inst || options) {
      inst = initTree(selector, options || (inst ? inst.options : {}));
      return inst;
    }
    return inst.reload();
  }

  function getTreeInstance(selector) {
    return $(selector).data('itsTreeView') || null;
  }

  function bindDebouncedInputs(selectors, handler, wait) {
    var timer = null;
    var delay = wait || 300;
    $(selectors).on('input change', function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        handler.apply(ctx, args);
      }, delay);
    });
  }

  window.ITS_tree_view = {
    buildQueryFromSelectors: buildQueryFromSelectors,
    bindDebouncedInputs: bindDebouncedInputs,
    getTreeInstance: getTreeInstance,
    initTree: initTree,
    reloadTree: reloadTree
  };
})(window, jQuery);
