/* Create the grid #grd from the route <url> */
/* Example: grd('/dictionary/step') */
function grd(url, width, fields) {
  
   function decimal(config) {
        jsGrid.fields.number.call(this, config);
    }

    decimal.prototype = new jsGrid.fields.number({

        filterValue: function() {
            return this.filterControl.val()
                ? parseFloat(this.filterControl.val() || 0, 10)
                : undefined;
        },

        insertValue: function() {
            return this.insertControl.val()
                ? parseFloat(this.insertControl.val() || 0, 10)
                : undefined;
        },

        editValue: function() {
            return this.editControl.val()
                ? parseFloat(this.editControl.val() || 0, 10)
                : undefined;
        }
    });

    jsGrid.fields.decimal = jsGrid.decimal = decimal;
  
  
  
  $("#grd").jsGrid({
    width: width, //"450px", "100%",
    height: "auto",
    filtering: true,
    inserting: true,
    editing  : true,
    sorting  : true,
    paging   : true,
    autoload : true,
    pageSize : 10,
    pageButtonCount: 5,
    deleteConfirm: "Are you sure you want to delete it?",
    controller: {
      loadData: function(fltr) {
        return $.ajax({
          type : "GET",   
          url  : url,
          data : fltr,
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
    fields: fields
  });

  /* Image preview */
  $("#div-img-preview").dialog({
    modal: true,
    autoOpen: false,
    position: { 
      my: "center",
      at: "center",
      of: $("#grd")
    }
  });
};

/* Create an <image> element */ 
function itemImg(img_path, id) { 
  var img_src = img_path + id + ".jpg";
  var img_id = "img" + id;
  var img = $("<img>")
    .addClass("grd-img")
    .attr("id", img_id)
    .attr("src", img_src)
    .on("error", function() { 
      /* Show the default image if the image file does not exist */
      $(this).attr('src', "../images/NoImage.jpg");
    })
    .on("click", function() {
      $("#img-preview").attr("src", img_src);
      $("#div-img-preview").dialog("open");
    });
  return img;
}

/* Create a <form> element for editing an item image */
function itemFrm(url, img_path, id){
  var inp_id = "inpImg" + id;
  var img_id = "img" + id;
  var img_edit_id = "img_edit_" + id;
  var frm = $("<form>")
    .addClass("grd-img-frm")
    .prop("enctype", "multipart/form-data")
    .prop("action", "")
    .prop("method", "POST");
  $("#" + img_id)
    .clone()
    .attr("id", img_edit_id)
    .appendTo(frm);  
  var inp = $("<input hidden>")
    .prop("id", inp_id)
    .addClass("grd-img-inp")
    .prop("type", "file")
    .prop("name", "filename")
    .prop("accept", ".jpg")
    .on('change', function(){
      var formData = new FormData(frm[0]);
      $.ajax({
        url: url +'/img/' + id,
        type: 'POST',
        data: formData,
        mimeType: "multipart/form-data",
        contentType: false,
        cache: false,
        processData: false,
        success: function (data, textStatus, jqXHR) {
          console.log("The image has been updated.");
          var img_src = img_path + id + ".jpg";
          $("#" + img_id).attr('src', img_src + '?' + Math.random());
          $("#" + img_edit_id).attr('src', img_src + '?' + Math.random());       
        },
        error: function(xhr, status, error) {handleError(error + "\n" + xhr.responseText);}
      });
    })
    .appendTo(frm);
  var btn = $("<button>")
    .prop("type", "button")
    .addClass("grd-img-btn")
    .click(function(){$("#" + inp_id).click();})
    .html("Change ...")
    .appendTo(frm);
  return frm;
}
