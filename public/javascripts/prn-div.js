// Print an HTML-element
function PrintDiv(id) {
  var data=document.getElementById(id).innerHTML;
  var myWindow = window.open('', 'Printing', 'height=400,width=600');
  myWindow.document.write('<html><head>');
  /*optional title*/ //myWindow.document.write('<title>my div</title>');
  /*optional stylesheet*/ //myWindow.document.write('<link rel="stylesheet" href="main.css" type="text/css" />');
  myWindow.document.write('</head><body>');
  myWindow.document.write(data);
  myWindow.document.write('</body></html>');
  myWindow.document.close(); // necessary for IE >= 10
  myWindow.onload=function(){ // necessary if the div contain images
    myWindow.focus(); // necessary for IE >= 10
    myWindow.print();
    myWindow.close();
 };
}
