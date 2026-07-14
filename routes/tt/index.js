var express = require('express');
var router  = express.Router();
var views   = [
  'tt-adm-map'     ,
  'tt-usr-map'     ,
  'tt-orders'      ,
  'tt-rpt-service' ,
  'tt-rpt-detailed',
  'tt-product-new' ,   
  'tt-steps-new'   ,   
  'tt-processes-new',   
  'tt-plan-new'    ,
  'tt-active-tasks'
];

/* GET pages. */
views.forEach(function(view) {
  router.get('/' + view, function(req, res) { 
    res.render(view);
  });
}); 
 
module.exports = router;
