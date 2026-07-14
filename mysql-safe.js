var mysql = require('mysql');

if (!mysql.__itsSafePatched) {
  var originalCreatePool = mysql.createPool;

  function attachConnectionErrorHandler(connection, scope) {
    if (!connection || connection.__itsErrorHandlerAttached) {
      return connection;
    }

    connection.__itsErrorHandlerAttached = true;
    connection.on('error', function (err) {
      console.error('[mysql' + (scope ? ':' + scope : '') + '] connection error:', err);
    });

    return connection;
  }

  mysql.createPool = function () {
    var pool = originalCreatePool.apply(mysql, arguments);

    if (!pool.__itsPoolErrorHandlerAttached) {
      pool.__itsPoolErrorHandlerAttached = true;
      pool.on('connection', function (connection) {
        attachConnectionErrorHandler(connection, 'pool');
      });
      pool.on('acquire', function (connection) {
        attachConnectionErrorHandler(connection, 'pool');
      });
    }

    return pool;
  };

  mysql.createConnection = function () {
    var pool = mysql.createPool.apply(mysql, arguments);
    pool.__itsConnectionCompat = true;
    return pool;
  };

  mysql.__itsSafePatched = true;
}

module.exports = mysql;
