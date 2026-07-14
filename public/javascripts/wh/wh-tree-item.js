const url = "/wh/tree-item";

/* ------------------------------------------------------------
   BASKET MODEL
------------------------------------------------------------ */
const basket = new Map(); 
// key = itemId, value = { name, qty, img }
let tree = null;

/* ------------------------------------------------------------
   HELPER: Enable/disable Save button based on required fields
------------------------------------------------------------ */
function checkEditModalRequired() {
  const btnSave = $("#btnEditSave");

  const nameVal = ($("#edit_item_name").val() || "").trim();
  const binVal  = ($("#edit_item_group").val() || "").trim();

  if (nameVal && binVal) {
    btnSave.prop("disabled", false).css({opacity:1, cursor:"pointer"});
  } else {
    btnSave.prop("disabled", true).css({opacity:0.6, cursor:"not-allowed"});
  }
}


/* ------------------------------------------------------------
   HELPER: Basket functions
------------------------------------------------------------ */
function loadBasketUsers() {
  $.getJSON(url + "/workers").done(rows => {
    const u = $("#basket_user")
      .empty()
      .append('<option value="">— Select —</option>');
    rows.forEach(r =>
      u.append(`<option value="${r.id}">${r.name}</option>`)
    );
  });
}

/* ------------------------------------------------------------
   Add red asterisk to required labels dynamically
------------------------------------------------------------ */
function markRequiredFields() {
  $("#editModal label.required").each(function() {
    if ($(this).find(".req-asterisk").length === 0) {
      $(this).append('<span class="req-asterisk" style="color:red; margin-left:2px;">*</span>');
    }
  });
}

/* ------------------------------------------------------------
   Create a new item (for new item dialog)
------------------------------------------------------------ */
function openNewItemDialog(parentGroupId) {
  const selectedGroupId = String(parentGroupId || "").split("/").pop();

  loadGroupsSelect(selectedGroupId);

  $("#edit_item_key").val("new:" + selectedGroupId);
  $("#edit_item_name").val("");

  $("#edit_item_vendor").val("");
  $("#edit_item_minQty").val("");
  $("#edit_item_img").val("");
  $("#edit_item_preview").hide();

  markRequiredFields();
  checkEditModalRequired();
  $("#editModalOverlay").fadeIn(150);
}

/* ------------------------------------------------------------
   Load item details (for edit dialog)
------------------------------------------------------------ */
function loadItemDetails(node) {
  const itemId = String(node.key).split("/").pop();

  $.getJSON(url + "/item/" + itemId ) 
    .done(function (data) {
      $("#edit_item_key").val(node.key);
      $("#edit_item_name").val(data.name || "");
      $("#edit_item_group").val(data.idgrp || "");
      $("#edit_item_vendor").val(data.vendor || "");
      $("#edit_item_minQty").val(data.minQty || "");
      $("#edit_item_nr").val(data.nr || "");
      $("#edit_item_itemNo").val(data.itemNo || "");
      $("#edit_item_price").val(data.price || "");

      if (data.img) {
        $("#edit_item_preview").attr("src", "data:image/jpeg;base64," + data.img).show();
      } else {
        $("#edit_item_preview").hide();
      }

      markRequiredFields();
      checkEditModalRequired();  // disable Save if Name or Storage Bin empty
      $("#editModalOverlay").fadeIn(150);
      window._editNode = node;
    })
    .fail(() => alert("Failed to load item."));
}

/* ------------------------------------------------------------
   Populate group dropdown (for edit dialog)
------------------------------------------------------------ */
function loadGroupsSelect(selectedGroupId) {
  const dd = $("#edit_item_group");
  const selected = String(selectedGroupId || dd.val() || "").trim();
  dd.empty().append('<option value="">— Select group —</option>');

  $.getJSON(url + "/groups")
    .done(rows => {
      rows.forEach(g => dd.append(`<option value="${g.id}">${g.name}</option>`));
      if (selected) {
        dd.val(selected);
      }
      checkEditModalRequired();
    })
    .fail(xhr => console.error("Failed to load groups:", xhr.responseText));
}

/* ------------------------------------------------------------
   Create a new main group
------------------------------------------------------------ */
function createMainGroup() {
  const name = prompt("Enter new main group name:");
  if (!name || !name.trim()) return;

  $.post(url + "/group", { name: name.trim() })
    .done(function () {
      loadGroupsSelect();
      reloadTree();
    })
    .fail(xhr => alert("Error creating group: " + (xhr.responseText || xhr.statusText)));
}

/* ------------------------------------------------------------
   Populate vendor dropdown (filter)
------------------------------------------------------------ */
function loadVendorDropdown() {
  const dd = $("#item_vendor");
  dd.empty().append('<option value="">— All —</option>');

  $.getJSON(url + "/vendors")
    .done(rows => {
      rows.forEach(v => dd.append(`<option value="${v.vendor}">${v.vendor}</option>`));
    })
    .fail(xhr => console.error("Vendor load error:", xhr.responseText));
}

/* ------------------------------------------------------------
 Get values from the Filter 
------------------------------------------------------------ */
function getFltr() {
  return ITS_tree_view.buildQueryFromSelectors(['.clsFltrInput', '.clsFltrSelect']);
}

function treeOptions() {
  return {
    source: {
      url: url + "/0" + getFltr(),
      cache: false
    },
    autoCollapse: true,
    table: { indentation: 20, nodeColumnIdx: 1 },
    renderColumns: function (event, data) {
      var node = data.node;
      var $row = data.row;
      var storage = node.data && node.data.nr != null ? node.data.nr : "";
      $row.find(".its-tree-name").text(storage);
    },
    columns: [
      {
        className: "its-tree-stock alignRight",
        render: function ($cell, node) {
          var stock = node.data && node.data.stock !== undefined && node.data.stock !== null
            ? node.data.stock
            : "";
          $cell.text(stock);
        }
      }
    ],
    onNodeDblClick: function (node) {
      if (!node.folder) {
        addToBasket(node);
      }
    }
  };
}

function getNodeFromTrigger($trigger) {
  var $row = $trigger.closest("tr.its-tree-node");
  if (!$row.length) {
    return null;
  }
  return $row.data("itsTreeNode") || null;
}

/* ------------------------------------------------------------
   ITEM HOVER POPUP (GLOBAL, REUSABLE)
------------------------------------------------------------ */
let hoverAjax = null;

function showHoverPopup(itemId, x, y) {

  if (!itemId || itemId === "undefined") return;

  // abort previous request (important!)
  if (hoverAjax) hoverAjax.abort();

  hoverAjax = $.getJSON(url + "/item/" + itemId )
    .done(data => {

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

      const $p = $("#hoverPopup");

      let left = x + 10;
      let top  = y + 10;

      const pw = $p.outerWidth();
      const ph = $p.outerHeight();
      const winW = $(window).width();
      const winH = $(window).height();

      if (left + pw + 10 > winW) left = winW - pw - 10;
      if (top + ph + 10 > winH) top = winH - ph - 10;
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      $p
        .css({ left, top })
        .addClass("show")
        .show();

    });
}

function hideHoverPopup() {
  if (hoverAjax) hoverAjax.abort();
  hoverAjax = null;
  $("#hoverPopup").removeClass("show").hide();
}

/* ------------------------------------------------------------
   Reload tree
------------------------------------------------------------ */
function reloadTree() {
  if (!tree) {
    return;
  }

  tree.options.source.url = url + "/0" + getFltr();
  tree.reload();
}

/* ------------------------------------------------------------
   Update filter background
------------------------------------------------------------ */
function updateFilterBackground() {
  $(".clsFltrInput, .clsFltrSelect").each(function () {
    const val = $(this).val();
    const hasValue = val !== null && String(val).trim().length > 0;

    $(this)
      .closest("td, th, .clsFltrCell")
      .toggleClass("clsFltrActive", hasValue);
  });
}

/* ------------------------------------------------------------
   Change filter
------------------------------------------------------------ */
let fltrTimer = null;

function changeFltr() {
  clearTimeout(fltrTimer);
  fltrTimer = setTimeout(() => {
    updateFilterBackground();   // <<< IMPORTANT
    reloadTree();
  }, 300);
}

/* ------------------------------------------------------------
   DOCUMENT READY
------------------------------------------------------------ */
$(function () {
  console.log("wh-tree-item.js loaded OK");

  /* Filters */
  $("#btnResetFltr").on("click", function () {
    $(".clsFltrInput, .clsFltrSelect").val("");
    updateFilterBackground();   // <<< IMPORTANT
    reloadTree();
  });

  $("#btnNewRootGroup").on("click", createMainGroup);

  updateFilterBackground();
  updateBasketBackground();   // default = outgoing
  updateBasketSaveBtn();

  
  /* Load dropdowns */
  loadVendorDropdown();
  loadGroupsSelect();
  loadBasketUsers();

  tree = ITS_tree_view.initTree("#tree-items", treeOptions());

  /* -------------------------
     CONTEXT MENU - NODE
     ------------------------- */
  $.contextMenu({
    selector: "#tree-items tr.its-tree-node",
    build: function ($trigger) {
      const node = getNodeFromTrigger($trigger);
      if (!node) {
        return false;
      }

      if (node.folder) {
        let empty = true;
        $.ajax({
          url: url + "/is-empty/" + node.key,
          async: false,
          success: res => empty = res.empty,
          error: () => empty = false
        });

        return {
          callback: key => handleFolderMenu(key, node),
          items: {
            add_sbg: { name: "New subgroup", icon: "add" },
            add: { name: "New item", icon: "add" },
            edit: { name: "Edit group", icon: "edit" },
            del: { name: "Delete group", icon: "delete", disabled: !empty }
          }
        };
      }

      return {
        callback: key => handleItemMenu(key, node),
        items: {
          edit  : { name: "Edit item", icon: "edit" },
          del   : { name: "Delete item", icon: "delete" },
          sep1  : "---------",
          last10: { name: "Last operation", icon: "copy" }
        }
      };
    }
  });

  /* -------------------------
     CONTEXT MENU - BACKGROUND
     ------------------------- */
  $.contextMenu({
    selector: "#tree-items",
    build: function ($trigger, e) {
      if ($(e.target).closest("tr.its-tree-node").length) return false;

      return {
        callback: function (key) {
          if (key === "new_root") {
            createMainGroup();
          }
        },
        items: {
          new_root: { name: "New root group", icon: "add" }
        }
      };
    }
  });

  /* -------------------------
     EDIT MODAL ACTIONS
     ------------------------- */
  $("#btnEditCancel").on("click", () => $("#editModalOverlay").fadeOut(150));

  $("#btnEditSave").on("click", function () {
    const key = $("#edit_item_key").val();
    const isNew = key.startsWith("new:");
    const parentGroupId = isNew ? key.split(":")[1] : null;

    const fd = new FormData();
    fd.append("name", $("#edit_item_name").val());
    fd.append("idgrp", $("#edit_item_group").val());
    fd.append("vendor", $("#edit_item_vendor").val());
    fd.append("minQty", $("#edit_item_minQty").val());
    fd.append("nr", $("#edit_item_nr").val());
    fd.append("itemNo", $("#edit_item_itemNo").val());
    fd.append("price", $("#edit_item_price").val());

    const f = $("#edit_item_img")[0].files[0];
    if (f) fd.append("img", f);

    let req;
    if (isNew) {
      req = $.ajax({
        url: url + "/item/" + parentGroupId + getFltr(),
        type: "POST",
        data: fd,
        processData: false,
        contentType: false
      });
    } else {
      req = $.ajax({
        url: url + "/" + key,
        type: "PUT",
        data: fd,
        processData: false,
        contentType: false
      });
    }

    req.done(() => {
        $("#editModalOverlay").fadeOut(150);
        reloadTree();
      })
      .fail(xhr => alert("Error saving: " + (xhr.responseText || xhr.statusText)));
  });

  /* -------------------------
     Required fields: watch inputs
  ------------------------- */
  $("#edit_item_name, #edit_item_group").on("input change", checkEditModalRequired);

  /* -------------------------
     HOVER POPUP (1 sec)
  ------------------------- */
  (function hoverPopup() {
    const timers = new WeakMap();
    function hide() {
      $("#hoverPopup").removeClass("show").hide();
    }

    $("#tree-items").on("mouseenter", "tr.its-tree-node", function (e) {
      const node = $(this).data("itsTreeNode");
      if (!node || node.folder) return;

      const itemId = String(node.key).split("/").pop();
      const startX = e.pageX;
      const startY = e.pageY;

      const timer = setTimeout(() => {
        showHoverPopup(itemId, startX, startY);
      }, 1000);

      timers.set(this, timer);
    });

    $("#tree-items").on("mouseleave", "tr.its-tree-node", function () {
      const t = timers.get(this);
      if (t) clearTimeout(t);
      timers.delete(this);
      hideHoverPopup();
    });

    $(document).on("mousemove", function (e) {
      const $p = $("#hoverPopup");
      if (!$p.is(":visible")) return;
      const o = $p.offset();
      if (!o) return;
      if (e.pageX < o.left || e.pageX > o.left + $p.outerWidth() ||
          e.pageY < o.top || e.pageY > o.top + $p.outerHeight()) {
        hide();
      }
    });
  })();
});

function checkStockRequired() {
  const ok =
    $("#stock_op").val() &&
    $("#stock_user").val() &&
    Number($("#stock_qty").val()) > 0;

  $("#btnStockSave").prop("disabled", !ok)
    .css({ opacity: ok ? 1 : 0.6 });
}

function openStockModal(node) {

  $("#stock_item_id").val(node.key);
  $("#stock_op, #stock_user, #stock_doc, #stock_qty").val("");

  $.getJSON(url + "/workers").done(rows => {
    const u = $("#stock_user")
      .empty()
      .append('<option value="">— Select —</option>');
    rows.forEach(r =>
      u.append(`<option value="${r.id}">${r.name}</option>`)
    );
  });

  checkStockRequired();
  $("#stockModalOverlay").fadeIn(150);
}

$("#stock_op, #stock_user, #stock_qty").on("change input", checkStockRequired);

$("#btnStockSave").on("click", function () {

  $.post(url + "/stock", {
    iditem: $("#stock_item_id").val(),
    op    : $("#stock_op").val(),
    userid: $("#stock_user").val(),
    doc   : $("#stock_doc").val(),
    qty   : $("#stock_qty").val()
  })
  .done(() => {
    $("#stockModalOverlay").fadeOut(150);
    reloadTree();
  })
  .fail(x => alert(x.responseText));
});

$("#btnStockCancel").on("click", () =>
  $("#stockModalOverlay").fadeOut(150)
);

/* ------------------------------------------------------------
   Open last operations modal
------------------------------------------------------------ */
function openLastOperation(node) {

  // store current node key for delete handler
  $("#lastOpOverlay").data("nodeKey", node.key);



  $.getJSON(url + "/item/" + node.key + "/last10")
    .done(rows => {

      const tb = $("#lastOpBody").empty();

      rows.forEach(r => {
        const qtyClass = Number(r.qty) >= 0 ? "qty positive" : "qty negative";

        tb.append(`
          <tr>
            <td class="col-check">
              <input type="checkbox" data-iddoc="${r.iddoc}" data-iditem="${r.iditem}">
            </td>
            <td class="col-date">${r.d}</td>
            <td class="col-doc">${r.grp}</td>
            <td class="${qtyClass}">${r.qty}</td>
            <td class="col-user">${r.worker}</td>
            <td class="col-note">${r.name || ""}</td>
          </tr>
        `);
      });

      updateLastOpDeleteBtn();
      $("#lastOpOverlay").fadeIn(150);
    });
}

/* ------------------------------------------------------------
   Delete selected operations (with confirm)
------------------------------------------------------------ */
$("#btnLastOpDelete").on("click", function () {

  const checked = $("#lastOpBody input:checked");
  if (!checked.length) return;

  if (!confirm(`Delete ${checked.length} selected operation(s)?`)) return;

  let pending = checked.length;
  let failed = false;

  function finishDeleteBatch() {
    if (pending !== 0) {
      return;
    }

    $("#lastOpOverlay").fadeOut(150);

    if (failed) {
      alert("Some operations could not be deleted.");
    }

    setTimeout(reloadTree, 100);
  }

  checked.each(function () {
    const iddoc = $(this).data("iddoc");
    const iditem = $(this).data("iditem");
    if (!iddoc || !iditem) {
      failed = true;
      pending--;
      finishDeleteBatch();
      return;
    }

    $.ajax({
      url: url + "/wh_doc_item/" + iddoc + "/" + iditem,
      type: "DELETE"
    })
    .fail(() => {
      failed = true;
    })
    .always(() => {
      pending--;
      finishDeleteBatch();
    });
  });
});

/* ------------------------------------------------------------
   Enable / disable Last Operation delete button
------------------------------------------------------------ */
function updateLastOpDeleteBtn() {
  const hasChecked = $("#lastOpBody input:checked").length > 0;
  $("#btnLastOpDelete")
    .prop("disabled", !hasChecked)
    .css("opacity", hasChecked ? 1 : 0.6);
}

/* Watch checkbox changes */
$("#lastOpBody").on("change", "input[type=checkbox]", updateLastOpDeleteBtn);

/* ------------------------------------------------------------
   Close modal
------------------------------------------------------------ */
$("#btnLastOpClose").on("click", () =>
  $("#lastOpOverlay").fadeOut(150)
);

/* ------------------------------------------------------------
   CONTEXT MENU HANDLERS
------------------------------------------------------------ */
function handleFolderMenu(key, node) {
  if (key === "add_sbg") {
    const name = prompt("Enter new subgroup name:");
    if (!name) return;
    $.post(url + "/group/" + node.key.split("/").pop(), { name: name.trim() })
      .done(reloadTree)
      .fail(xhr => alert("Error creating subgroup: " + xhr.responseText));
    return;
  }

  if (key === "add") {
    openNewItemDialog(node.key);
    return;
  }

  if (key === "edit") {
    const newName = prompt("Enter new group name:", node.title);
    if (!newName) return;
    $.ajax({
      url: url + "/" + node.key,
      type: "PUT",
      data: { name: newName.trim() }
    })
      .done(() => { reloadTree(); })
      .fail(() => alert("Failed to rename group."));
    return;
  }

  if (key === "del") {
    if (!confirm("Delete this group?")) return;
    $.ajax({ url: url + "/" + node.key, type: "DELETE" })
      .done(reloadTree)
      .fail(() => alert("Failed deleting group."));
    return;
  }
}

function handleItemMenu(key, node) {
  if (key === "edit") loadItemDetails(node);
  if (key === "del") {
    if (!confirm("Delete this item master? Stock operations for this item are not deleted here.")) return;
    $.ajax({ url: url + "/" + node.key, type: "DELETE" })
      .done(reloadTree)
      .fail(xhr => alert(xhr.responseText || "Failed deleting item master."));
  }

  if (key === "last10") openLastOperation(node);
  
}

/* Basket functions */ 
function addToBasket(node) {
  const itemId = String(node.key).split("/").pop();
  const name = node.title;

  if (basket.has(itemId)) {
    basket.get(itemId).qty += 1;
    renderBasket();
    return;
  }

  // Load image once
  $.getJSON(url + "/item/" + itemId)
    .done(data => {
      basket.set(itemId, {
        name,
        bin: String(node.data.nr != null ? node.data.nr : "").trim(),
        qty: 1,
        img: data.img || null
      });
      renderBasket();
    })
    .fail(() => {
      // fallback without image
      basket.set(itemId, { name, qty: 1, img: null });
      renderBasket();
    });
}

function renderBasket() {
  const tb = $("#basketBody").empty();

  basket.forEach((v, id) => {
    tb.append(`
      <tr data-id="${id}">
        <td class="basket-item">
          <span class="basket-name">
            <span class="basket-bin">[A-01]</span>
            ${v.name}
          </span>
        </td>
      
        <td class="basket-qty">
          <input type="number"
                 class="basket-qty-input"
                 min="1"
                 value="${v.qty}">
        </td>
      
        <td>
          <button class="btnRemove">✕</button>
        </td>
      </tr>
    `);
  });
  updateBasketSaveBtn();
}

$("#basketBody").on("input change", ".basket-qty-input", function () {
  const tr = $(this).closest("tr");
  const id = tr.data("id");
  let val = parseInt(this.value, 10);

  if (isNaN(val) || val < 1) {
    val = 1;
    this.value = 1;
  }

  const item = basket.get(String(id));
  if (item) {
    item.qty = val;
  }
});

$("#basketBody").on("click", ".btnRemove", function () {
  const tr = $(this).closest("tr");
  basket.delete(tr.data("id"));
  tr.remove();
  updateBasketSaveBtn();
});

function getBasketOp() {
  return $('input[name="basket_op"]:checked').val() || "";
}

function updateBasketBackground() {
  const $panel = $("#basketPanel").removeClass("op-Outgoing op-Incoming op-Inventory");

  const op = getBasketOp();
  if (op === "Outgoing") $panel.addClass("op-Outgoing");
  if (op === "Incoming")  $panel.addClass("op-Incoming");
  if (op === "Inventory") $panel.addClass("op-Inventory");
}

$('input[name="basket_op"]').on("change", function () {
  updateBasketBackground();
  updateBasketSaveBtn();
});

$("#basket_user").on("change", updateBasketSaveBtn);

function updateBasketSaveBtn() {
  const ok =
    basket.size > 0 &&
    getBasketOp() &&
    $("#basket_user").val();

  $("#btnBasketSave").prop("disabled", !ok);
}

$("#btnBasketSave").on("click", function () {

  const $btn = $(this);

  // 🔒 prevent double submit
  $btn.prop("disabled", true);

  // Sync DOM → payload
  const items = [];

  $("#basketBody tr").each(function () {
    const id = String($(this).data("id") || "").split("/").pop();
    const qty = Number($(this).find(".basket-qty-input").val());

    if (qty > 0) {
      items.push({ iditem: id, qty });
    }
  });

  if (!items.length) {
    $btn.prop("disabled", false); // re-enable if nothing to send
    return;
  }

  $.ajax({
    url: url + "/stock/batch",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      op    : getBasketOp(),
      userid: $("#basket_user").val(),
      doc   : $("#basket_doc").val(),
      items : items
    })
  })
  
  
  .done(() => {
    basket.clear();
    renderBasket();

    $("#basket_op").val("");
    $("#basket_user").val("");
    $("#basket_doc").val("");

    reloadTree();
  })

  .fail(xhr => {
    alert(xhr.responseText || "Batch operation failed");
  })
  .always(() => {
    // 🔓 re-enable after success OR error
    $btn.prop("disabled", false);
  });
});

$("#btnBasketClear").on("click", function () {
  if (!basket.size) return;
  if (!confirm("Clear basket?")) return;
  basket.clear();
  renderBasket();
});

$(".clsFltrInput, .clsFltrSelect").on("input change", changeFltr);

$("#basketBody").on("focus", ".basket-qty-input", function () {
  this.select();
});

$("#basketBody").on("keydown", ".basket-qty-input", function (e) {
  if (e.key === "Enter") {
    this.blur();
  }
});

let basketHoverTimer = null;

$("#basketBody")
  .on("mouseenter", ".basket-item", function (e) {

    const rawId = $(this).closest("tr").data("id");
    if (!rawId) return;

    const itemId = String(rawId).split("/").pop();

    basketHoverTimer = setTimeout(() => {
      showHoverPopup(itemId, e.pageX + 15, e.pageY + 15);
    }, 700);
  })
  .on("mousemove", ".basket-item", function (e) {
    $("#hoverPopup").css({
      top: e.pageY + 15,
      left: e.pageX + 15
    });
  })
  .on("mouseleave", ".basket-item", function () {
    clearTimeout(basketHoverTimer);
    basketHoverTimer = null;
    hideHoverPopup();
  });

$("#btnBasketPrint").on("click", function () {

  if (!basket.size) {
    alert("Basket is empty");
    return;
  }

  const items = [];

  basket.forEach((v, id) => {
    items.push({
      iditem: String(id).split("/").pop(),
      qty: v.qty
    });
  });

  const headers = { "Content-Type": "application/json" };
  if (window.ITS_AUTH_TOKEN) {
    headers["x-its-auth-token"] = window.ITS_AUTH_TOKEN;
  }

  fetch(url + "/basket/print", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ items })
  })
  .then(res => {
    if (!res.ok) {
      return res.text().then(text => {
        throw new Error(text || "Failed to generate PDF");
      });
    }
    return res.blob();
  })
  .then(blob => {
    const pdfUrl = URL.createObjectURL(blob);
    window.open(pdfUrl, "_blank");
  })
  .catch(err => alert(err.message || "Failed to generate PDF"));
});
