var lastRefreshTime = 0;
var funCyclicRferesh = null;

/* Refresh map every ... sec if the page has focus */
function doRefresh() {
  if (document.hasFocus())
    mapRefresh();
}

/* On startup */
$(document).ready(function(){
  $("#btn-refresh").click(function(){mapRefresh();});
  mapRefresh();
  funCyclicRferesh = setInterval(doRefresh, $("#map-refresh-time")[0].value * 1000);
});

/* Change refresh time */
$("#map-refresh-time").change(function() {
  if (funCyclicRferesh != null)
    clearInterval(funCyclicRferesh);
  funCyclicRferesh = setInterval(doRefresh, $("#map-refresh-time")[0].value * 1000);
});
