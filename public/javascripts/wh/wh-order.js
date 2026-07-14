//var img_path = '../images/wh_item/'; 
var url = '/dictionary/wh_v_item';
var url_order = '/wh/order';

//var fields = [
//  {name: "id", visible: false, type: "number"},
//  {name: "img", title: "Photo", 
////    itemTemplate: function(val, item){return itemImg(img_path, item.id);},
//    itemTemplate: function(val, item){return "<img src='" + (item.img.length >0 ? "data:image/jpg;base64," + item.img : "data:,") + "'>" ;},
//    align: "center",
//    width: 100
//  },
//  {name: "nr",      title: "Storage", type: "text",   width:  80},
//  {name: "stock",   title: "On stock", type: "number",   width:  80, filtering: false},
//  {name: "grp",     title: "Group",   type: "text",   width: 100},
//  {name: "vendor",  title: "Vendor",  type: "text",   width: 100},
//  {name: "name",    title: "Name",    type: "text",   width: 150},
//  {name: "itemNo",  title: "Item Nr", type: "text",   width: 100}
//];

var fields_order = [
  {name: "nr",      title: "Storage", type: "text",   width:  80},
  {name: "qty",     title: "Quantity",  type: "text", width:  80},
  {name: "dtarget", title: "Target Date", type: "text", width: 100},
  {type: "control", itemTemplate: function(value, item) {return $([]).add(this._createDeleteButton(item));}} // Hide the "Edit" button
];

$(document).ready(function(){
  
  $('#worker').on('change', reloadOrder);  

  // Populate the dropdown  
  let dropdown = $("#worker");
  dropdown.empty()
          .append('<option selected="true" disabled>... Select your name ...</option>')
          .prop('selectedIndex', 0);
  $.ajax({
    type: "GET",
    url: "/wh/order/workers",
    cache: false,
    error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
  }).done(function(data) {
    $.each(data, function (key, entry) {
      dropdown.append($('<option></option>').attr('value', entry.id).text(entry.fullname));
    });
  });
   
  // Items
  $("#grd").jsGrid({
    width: "350px", //"450px", "100%",
    height: "auto",
    filtering: true,
    inserting: false,
    editing  : false,
    //sorting  : true,
    paging   : true,
    autoload : true,
    pageSize : 5,
    pageButtonCount: 5,
    controller: {
      loadData: function(fltr) {
        return $.ajax({
          type : "GET",   
          url  : url,
          data : getFltr(),
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      }
    },
  
    rowRenderer: function(item) {
  
      var $img = $("<div>").addClass("dict-img").append($("<img>")
        .attr("src", (item.img.length >0 ? "data:image/jpg;base64," + item.img : "data:,"))
        .attr("alt", "No image"));
  
      var $info = $("<div>").addClass("dict-info")
        .append($("<p>").addClass("dict-nr").append(item.nr + " (" + item.stock + " pcs)"))
        .append($("<p>").addClass("dict-name").append(item.name))
        .append($("<p>").addClass("dict-grp").append(item.vendor + " " + item.itemNo))
        .append($("<p>").addClass("dict-grp").append(item.grp));
  
      return $("<tr>").append($("<td>").append($img).append($info));
  
    },
  
    fields: [
      { headerTemplate: function() {
        var $fltr = $("<td>")
                    .append($("<input placeholder='Nr'      title='Filter: Nr'     >").addClass("dict-fltr").attr("id", "fltr-nr"    ))
                    .append($("<input placeholder='Name'    title='Filter: Name'   >").addClass("dict-fltr").attr("id", "fltr-name"  ))
                    .append($("<input placeholder='Group'   title='Filter: Group'  >").addClass("dict-fltr").attr("id", "fltr-grp"   ))
                    .append($("<input placeholder='Vendor'  title='Filter: Vendor' >").addClass("dict-fltr").attr("id", "fltr-vendor"))
                    .append($("<input placeholder='Item Nr' title='Filter: Item Nr'>").addClass("dict-fltr").attr("id", "fltr-itemNo"));
  
        var $tr = $("<tr>").append($fltr);
  
        return $("<table>").append($tr);
      }}
    ]
  });
  $("#grd").jsGrid("option", "rowDoubleClick", function({item, itemIndex, event}){addItem(item);});

  // Apply the filter
  $('.dict-fltr').on('change',function(e){
    $("#grd").jsGrid("loadData");
  });

  $("#grd-order").jsGrid({
    width: "250px", //"450px", "100%",
    height: "auto",
    filtering: false,
    inserting: false,
    editing  : false,
    autoload : true,
    controller: {
      loadData: function(fltr) {
        return $.ajax({
          type : "GET",   
          url  : getURLOrder(),
          //data : fltr,
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      },
      deleteItem: function(item) {
        return $.ajax({
          type : "DELETE",   
          url  : getURLOrder(), 
          data : item,
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      }
    },
    fields: fields_order
  });
});


/* Reload the order */
function reloadOrder() {
  $("#grd-order").jsGrid("render");
}  

/* Get URL for the table of order */
function getURLOrder() {
  return url_order + "/" + ($("#worker").val() ? $("#worker").val() : 0);
}

/* Add item to the order */
function addItem(item) {
  if ($("#worker").val()) {
    if (item.stock >0) {
      let qty = prompt("Quantity", "1");
      if (qty > 0 && qty <= item.stock) {
        let dtarget = $("#dtarget").val();
        $.ajax({
          type : "POST",   
          url  : getURLOrder(),
          data : {iditem: item.id, qty: qty, dtarget: dtarget},
          cache: false,
          success: function (res) {reloadOrder();},
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      } else
        alert("Out of stock.");
    } else
      alert("Out of stock.");
  } else
    alert("Please select your name.");
}  

function getFltr() {
  var fltr = {};
  if ($('#fltr-nr').val())
    fltr.nr = $('#fltr-nr').val();
  if ($('#fltr-name').val())
    fltr.name = $('#fltr-name').val();
  if ($('#fltr-grp').val())
    fltr.grp = $('#fltr-grp').val();
  if ($('#fltr-vendor').val())
    fltr.vendor = $('#fltr-vendor').val();
  if ($('#fltr-itemNo').val())
    fltr.itemNo = $('#fltr-itemNo').val();
  return fltr;
}
