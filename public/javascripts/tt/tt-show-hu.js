document.querySelector("#hu").addEventListener("keyup", function(event) {
  if(event.key !== "Enter") return; 
  let hu = $('#hu').val();
  $('#hu').val('');
  if(0 + hu > 0)
    showHU(hu);
});

function showHU(hu) {
   let $dialog = $('<div id="divInfo"></div>')
     .html('<iframe id="prnFrameHU_' + + hu + '" style="border: 0px; " src="/tt/hu/' + hu + '" width="100%" height="100%"></iframe>')
     .dialog({
        autoOpen: false,
        modal: true,
        height: 550,
        width: 750,
        title: "Processing list",
        buttons: {
          Print: function() {
            document.getElementById("prnFrameHU_" + hu).contentWindow.print();
            $(this ).dialog("close");
          },
          Close: function() {
            $(this ).dialog("close");
          }
        },
        show: {
          effect: "fade",
          duration: 500
        },
        hide: {
          effect: "fade",
          duration: 500
        }
      });
    $dialog.dialog('open');
};

function showOrder(idorder) {
   let $dialog = $('<div id="divInfo"></div>')
     .html('<iframe id="prnFrameOrder_' + idorder + '" style="border: 0px; " src="/tt/hu/order/' + idorder + '" width="100%" height="100%"></iframe>')
     .dialog({
        autoOpen: false,
        modal: true,
        height: 550,
        width: 750,
        title: "Order",
        buttons: {
          Print: function() {


            // ??? Cannot print the second time ???
            document.getElementById("prnFrameOrder_" + idorder).contentWindow.print();
            $(this ).dialog("close");


//            var data=document.getElementById("prnFrameOrder_" + idorder).innerHTML;
//            var myWindow = window.open('', 'Print', 'height=400,width=600');
//            myWindow.document.write('<html><head><title>Print</title>');
//            /*optional stylesheet*/ //myWindow.document.write('<link rel="stylesheet" href="main.css" type="text/css" />');
//            myWindow.document.write('</head><body >');
//            myWindow.document.write(data);
//            myWindow.document.write('</body></html>');
//            myWindow.document.close(); // necessary for IE >= 10
//            myWindow.onload=function(){ // necessary if the div contain images
//              myWindow.focus(); // necessary for IE >= 10
//              myWindow.print();
//              myWindow.close();
//            };
          },  
          Close: function() {
            $(this).dialog("close");
          }
        },
        show: {
          effect: "fade",
          duration: 500
        },
        hide: {
          effect: "fade",
          duration: 500
        }
      });
    $dialog.dialog('open');
};
