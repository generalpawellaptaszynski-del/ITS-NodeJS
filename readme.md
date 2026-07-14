Time Tracking Application
=========================
Source code for Time Tracking Application.

Build
-----
Run this command in console:
$ npm install
All dependencies will be downloaded by `npm` to `node_modules` folder.

Run
---
Run this command in console:
$ npm start
or
$ npm run dev

Alternative servers:
$ node app-its-gui-port3001.js
$ node app-its-iot-port3002.js

Open `http://<server-name>:3003` to access the main development server.

Configuration
-------------
Set the database credentials in the process environment before starting the app.
For local development, create a local `.env` file from `.env.example`.

Required database variables:

```
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
```

Optional hardening variables:

```
DB_INSECURE_AUTH=false
DB_MULTIPLE_STATEMENTS=false
ITS_AUTH_TOKEN=
```

If `ITS_AUTH_TOKEN` is set, mutating requests (`POST`, `PUT`, `PATCH`,
`DELETE`) must send the token as `X-ITS-Auth-Token`, `Authorization: Bearer
<token>`, cookie `its_auth_token`, or query parameter `authToken`.

Some older routes still use multi-statement SQL. Keep `DB_MULTIPLE_STATEMENTS`
disabled unless those routes are required and have been reviewed.
