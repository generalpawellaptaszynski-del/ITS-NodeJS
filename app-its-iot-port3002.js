/* IoT / lightweight API server */
var port = process.env.PORT || 3002;

var appCore      = require('./app-core'),
  tt_tag        = require('./routes/tt/tag'),
  tt_user       = require('./routes/tt/user'),
  tt_heartbeat  = require('./routes/tt/heartbeat'),
  ta_index      = require('./routes/ta/index');
      
var app = appCore.createApp({ staticNodeModules: true, useStylus: false });

appCore.mountRoutes(app, [
  { path: '/tt/tag', handler: tt_tag },
  { path: '/tt/user', handler: tt_user },
  { path: '/tt/heartbeat', handler: tt_heartbeat },
  { path: '/ta/', handler: ta_index }
]);

appCore.registerDefaultErrorHandlers(app);
app.listen(port, () => {
    console.log('[its-iot] running on port ' + port);
});

module.exports = app;
