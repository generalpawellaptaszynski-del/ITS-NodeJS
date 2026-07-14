var url = '/dictionary/wh_item';

$(document).ready(function(){

  $("#grd").jsGrid({
    width: "350px", //"450px", "100%",
    height: "auto",
    filtering: true,
    inserting: false,
    editing  : true,
    //sorting  : true,
    paging   : true,
    autoload : true,
    pageSize : 5,
    pageButtonCount: 5,
    deleteConfirm: "Are you sure you want to delete it?",
    rowClick: function(args) {
      showDetailsDialog("Edit", args.item);
    },
    controller: {
      loadData: function(fltr) {
        return $.ajax({
          type : "GET",   
          url  : url,
          data : getFltr(),
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      },
      insertItem: function(item) {
        return $.ajax({
          type : "POST",   
          url  : url, 
          data : item,
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      },
      updateItem: function(item) {
        return $.ajax({
          type : "PUT",   
          url  : url, 
          data : item,
          cache: false,
          error: function(xhr, status, error) {alert(error + "\n" + xhr.responseText);}
        });
      },
      deleteItem: function(item) {
        return $.ajax({
          type : "DELETE",   
          url  : url, 
          data : item,
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
        .append($("<p>").addClass("dict-nr").append(item.nr))
        .append($("<p>").addClass("dict-name").append(item.name))
        .append($("<p>").addClass("dict-grp").append(item.vendor + " " + item.itemNo))
        .append($("<p>").addClass("dict-grp").append(item.grp));
        //.append($("<p>").addClass("dict-grp").append(item.price))
        //.append($("<p>").addClass("dict-grp").append(item.minQty));

      return $("<tr>").append($("<td>").append($img).append($info));

    },

    fields: [
      { headerTemplate: function() {

        var $btn =  $("<td>")
                    .append($("<button>").attr("type", "button").addClass("dict-btn").text("New").on("click", function() {
                      showDetailsDialog("Add", {});
                    }));

        var $fltr = $("<td>")
                    .append($("<input placeholder='Nr'      title='Filter: Nr'     >").addClass("dict-fltr").attr("id", "fltr-nr"    ))
                    .append($("<input placeholder='Name'    title='Filter: Name'   >").addClass("dict-fltr").attr("id", "fltr-name"  ))
                    .append($("<input placeholder='Group'   title='Filter: Group'  >").addClass("dict-fltr").attr("id", "fltr-grp"   ))
                    .append($("<input placeholder='Vendor'  title='Filter: Vendor' >").addClass("dict-fltr").attr("id", "fltr-vendor"))
                    .append($("<input placeholder='Item Nr' title='Filter: Item Nr'>").addClass("dict-fltr").attr("id", "fltr-itemNo"));

        var $tr = $("<tr>").append($btn).append($fltr);

        return $("<table>").append($tr);
      }}
    ]
  });

  // Dialog - Edit item 
  $("#detailsDialog").dialog({
    autoOpen: false,
    width: "630px",
    close: function() {
        $("#detailsForm").validate().resetForm();
        $("#detailsForm").find(".error").removeClass("error");
    }
  });

  // Validate input
  $("#detailsForm").validate({
    rules: {
      nr  : "required",
      name: "required"
    },
    messages: {
      nr  : "Please enter nr",
      name: "Please enter name"
    },
    submitHandler: function() {
      formSubmitHandler();
    }
  });

  var formSubmitHandler = $.noop;

  var showDetailsDialog = function(dialogType, item) {
    $("#name").val(item.name);
    $("#nr").val(item.nr);
    $("#grp").val(item.grp);
    $("#vendor").val(item.vendor);
    $("#itemNo").val(item.itemNo);
    $("#price").val(item.price);
    $("#minQty").val(item.minQty);
    $("#img").attr("src", (item.img ? "data:image/jpg;base64," + item.img : "data:,"));

    // Show/hide the image
    if (dialogType === "Add") {
      $("#remark-img").hide();
      $("#img").hide();
    } else {
      $("#remark-img").show();
      $("#img").show();
    };

    formSubmitHandler = function() {
      saveItem(item, dialogType === "Add");
    };

    $("#detailsDialog").dialog("option", "title", dialogType + " Employee")
     .dialog("open");
  };

  // Save the worker info
  var saveItem = function(item, isNew) {
    $.extend(item, {
      name  : $("#name"  ).val(),
      nr    : $("#nr"    ).val(),
      grp   : $("#grp"   ).val(),
      vendor: $("#vendor").val(),
      itemNo: $("#itemNo").val(),
      price : $("#price" ).val(),
      minQty: $("#minQty").val()
    });
    $("#grd").jsGrid(isNew ? "insertItem" : "updateItem", item);

    if (isNew) 
      $("#grd").jsGrid("loadData");

    $("#detailsDialog").dialog("close");
  }; 

  // Context menu
  $.contextMenu({
    selector: '.jsgrid-row, .jsgrid-alt-row',
      callback: function (key, options) {
        var item = $(this).data("JSGridItem");
        switch(key) {
          case "badge":
            showItem(item.id);
            break;
          case "del":
            if (confirm("Delete '" + item.name + "'?")) {
              $.ajax(url, {
                type: "DELETE",  // http method
                data: {id: item.id},
                error: function (jqXhr, textStatus, errorMessage) {
                  alert("ERROR: Request failed.");
                },
                success: function (jqXhr, textStatus, errorMessage) {
                  $("#grd").jsGrid("loadData");
                }
              });  
            }
            break;
        };
      },
      items: {
        "badge": {name: "Print a badge", icon: "edit"},
        separator1: {"type": "cm_separator"},
        "del": {name: "Delete", icon: "delete"}
      }
  });

  // Apply the filter
  $('.dict-fltr').on('change',function(e){
    $("#grd").jsGrid("loadData");
  });

  // Change the image
  $("#img").dblclick(function(){
    $("#filename").click();
  });

/*
  $("#filename").on('change', function(e){
    if(this.files[0].size > 1*1024*1024){ // 1 MB
      alert("File is too big!");
      this.value = "";
    } else {

      var frm = $("#detailsForm");
      var formData = new FormData(frm[0]);
      $.ajax({
        url: url + '/img',
        type: 'POST',
        data: formData,
        mimeType: "multipart/form-data",
        contentType: false,
        cache: false,
        processData: false,
        success: function (data, textStatus, jqXHR) {
          //console.log("The image has been updated.");
          $("#detailsDialog").dialog("close");
          $("#grd").jsGrid("loadData");
        },
        error: function(xhr, status, error) {handleError(error + "\n" + xhr.responseText);}
      });
    };  
  })
*/
  $("#filename").on('change', function (e) {
    const file = this.files[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20 MB

    if (file.size > maxSize) {
      alert("File is too big! Maximum allowed is 20 MB.");
      this.value = ""; // reset input
      return;
    }

    const frm = $("#detailsForm")[0];
    const formData = new FormData(frm);

    $.ajax({
      url: url + '/img',
      type: 'POST',
      data: formData,
      mimeType: "multipart/form-data",
      contentType: false,
      cache: false,
      processData: false,
      success: function (data, textStatus, jqXHR) {
        // Optional: parse response if needed
        try {
          const res = JSON.parse(data);
          if (res.Result === "OK") {
            console.log("✅ Image uploaded successfully.");
          } else {
            console.warn("⚠️ Server responded:", res.Message);
          }
        } catch (err) {
          console.warn("Upload response:", data);
        }
 
        $("#detailsDialog").dialog("close");
        $("#grd").jsGrid("loadData");
      },
      error: function (xhr, status, error) {
        const msg = error + "\n" + (xhr.responseText || "Upload failed");
        console.error("❌ Upload error:", msg);
        handleError(msg);
      },
      complete: () => {
        // reset file input so the same file can be selected again
        $("#filename").val('');
      }
    });
  });


});

function getFltr() {

  // Mark not empty conditions
  $('.dict-fltr').each(function (i, link) {
    if ($(link).val().length > 0) 
      $(link).addClass('accent');
    else 
      $(link).removeClass('accent');
  });

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

function showItem(id) {
  let $dialog = $('<div id="divInfo"></div>')
    .html('<iframe style="border: 0px; " src="/wh/item_info/' + id + '" width="100%" height="100%"></iframe>')
    .dialog({
      autoOpen: false,
      modal: true,
      height: 550,
      width: 750,
      title: "Item",
      buttons: {
        Print: function() {
          PrintDiv("divInfo");  
          $(this ).dialog("close");
        },
        Close: function() {
          $(this).dialog("close");
        }
      },
      show: { effect: "fade", duration: 500},
      hide: { effect: "fade", duration: 500}
    });
  $dialog.dialog('open');
};
