var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
  res.redirect('/tt/tt-orders');
});
 
var views   = [
  'worker'
];

/* GET pages. */
views.forEach(function(view) {
  router.get('/' + view, function(req, res) { 
    res.render(view);
  });
}); 

module.exports = router;
