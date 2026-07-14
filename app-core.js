/* Shared Express app factory for ITS servers */
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var stylus = require('stylus');
var nib = require('nib');
var createAuthMiddleware = require('./middleware/auth');
require('./mysql-safe');

function compile(str, filePath) {
  return stylus(str)
    .set('filename', filePath)
    .use(nib());
}

function createApp(options) {
  options = options || {};
  var app = express();
  app.disable('x-powered-by');

  app.set('etag', false);
  app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

  var views = options.views || [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'views/kt'),
    path.join(__dirname, 'views/wh'),
    path.join(__dirname, 'views/tt'),
    path.join(__dirname, 'views/ta')
  ];

  app.set('views', views);
  app.set('view engine', options.viewEngine || 'jade');

  app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(logger('dev'));
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: false }));
  app.use(cookieParser());
  app.use(function(req, res, next) {
    res.locals.itsAuthToken = (options.auth && options.auth.token) || process.env.ITS_AUTH_TOKEN || '';
    next();
  });
  app.use(createAuthMiddleware(options.auth || {}));

  if (options.useStylus !== false) {
    app.use(stylus.middleware({ src: path.join(__dirname, 'public'), compile: compile }));
  }

  app.use(express.static(path.join(__dirname, 'public')));
  if (options.staticNodeModules) {
    app.use(express.static(path.join(__dirname, 'node_modules')));
  }

  return app;
}

function registerDefaultErrorHandlers(app) {
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ error: err.message, status: err.status || 500 });
    }
    res.render('error');
  });
}

function mountRoutes(app, routes) {
  if (!Array.isArray(routes)) {
    return;
  }

  routes.forEach(function(route) {
    if (route.path && route.handler) {
      app.use(route.path, route.handler);
    } else if (route.handler) {
      app.use(route.handler);
    }
  });
}

module.exports = {
  createApp: createApp,
  mountRoutes: mountRoutes,
  registerDefaultErrorHandlers: registerDefaultErrorHandlers
};
