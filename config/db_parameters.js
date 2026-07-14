var fs = require('fs');
var path = require('path');

function loadDotEnv() {
  var envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach(function(line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed[0] === '#') {
        return;
      }

      var idx = trimmed.indexOf('=');
      if (idx < 0) {
        return;
      }

      var key = trimmed.slice(0, idx).trim();
      var value = trimmed.slice(idx + 1).trim();

      if (value && ((value[0] === '"' && value[value.length - 1] === '"') ||
                    (value[0] === '\'' && value[value.length - 1] === '\''))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

loadDotEnv();

function requiredEnv(name) {
  if (!process.env[name]) {
    throw new Error('Missing required environment variable: ' + name);
  }

  return process.env[name];
}

var db_parameters = {
  host     : requiredEnv('DB_HOST'),
  user     : requiredEnv('DB_USER'),
  password : requiredEnv('DB_PASSWORD'),
  database : requiredEnv('DB_NAME'),
  insecureAuth : process.env.DB_INSECURE_AUTH === 'true',
  multipleStatements: process.env.DB_MULTIPLE_STATEMENTS === 'true'
};
module.exports = db_parameters;
