/* Main development server */
var appCore        = require('./app-core'),
  index           = require('./routes/index'),
  worker          = require('./routes/worker'),
  dictionary      = require('./routes/dictionary'),
  upload          = require('./routes/upload'),
// backup         = require('./routes/backup'),
                  
  tt_hu           = require('./routes/tt/hu'),
  tt_map          = require('./routes/tt/map'),
  tt_tag          = require('./routes/tt/tag'),
  tt_plan         = require('./routes/tt/plan'),
  tt_user         = require('./routes/tt/user'),
  tt_index        = require('./routes/tt/index'),
  tt_report       = require('./routes/tt/report'),
  tt_product      = require('./routes/tt/product'),
  tt_process      = require('./routes/tt/process'),
  tt_heartbeat    = require('./routes/tt/heartbeat'),
  tt_active_tasks = require('./routes/tt/active-tasks'),
  wh_index        = require('./routes/wh/index'),
  wh_order        = require('./routes/wh/order'),
  wh_report       = require('./routes/wh/report'),
  wh_tree_item    = require('./routes/wh/tree-item'),
                  
  ta_index        = require('./routes/ta/index');
      
var port = process.env.PORT || 3003;
var app = appCore.createApp({ staticNodeModules: true });

appCore.mountRoutes(app, [
  { path: '/', handler: index },
  { path: '/worker', handler: worker },
  { path: '/dictionary', handler: dictionary },
  { path: '/upload', handler: upload },
  // { path: '/backup', handler: backup },
  { path: '/tt/', handler: tt_index },
  { path: '/tt/hu', handler: tt_hu },
  { path: '/tt/map', handler: tt_map },
  { path: '/tt/tag', handler: tt_tag },
  { path: '/tt/plan', handler: tt_plan },
  { path: '/tt/user', handler: tt_user },
  { path: '/tt/report', handler: tt_report },
  { path: '/tt/product', handler: tt_product },
  { path: '/tt/process', handler: tt_process },
  { path: '/tt/heartbeat', handler: tt_heartbeat },
  { path: '/tt/active-tasks', handler: tt_active_tasks },
  { path: '/wh/', handler: wh_index },
  { path: '/wh/order', handler: wh_order },
  { path: '/wh/report', handler: wh_report },
  { path: '/wh/tree-item', handler: wh_tree_item },
  { path: '/ta/', handler: ta_index }
]);

appCore.registerDefaultErrorHandlers(app);
app.listen(port, () => console.log('ITS (DEV) listening on port ' + port + '!'));

module.exports = app;
