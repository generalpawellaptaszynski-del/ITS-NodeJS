var express = require('express'),
    db_parameters = require('../../config/db_parameters'),
    mysql   = require('mysql');
var router = express.Router();
var db = mysql.createPool(db_parameters);
var API_QUERY_TIMEOUT_MS = 15000;

function buildActiveTasksPayload(rows) {
    var resultRows = Array.isArray(rows && rows[0]) ? rows[0] : (Array.isArray(rows) ? rows : []);
    var orders = [];
    var orderMap = new Map();

    resultRows.forEach(function(r) {
        if (!orderMap.has(r.order)) {
            var orderRecord = {
                order: r.order,
                order_complete: r.order_complete,
                product: r.product,
                hus: []
            };
            orderMap.set(r.order, orderRecord);
            orders.push(orderRecord);
        }

        orderMap.get(r.order).hus.push([
            r.hu,
            r.hu_complete,
            r.worker,
            r.step,
            r.place
        ]);
    });

    return {
        ts: new Date(),
        o: orders.map(function(order) {
            return [
                order.order,
                order.order_complete,
                order.hus,
                order.product
            ];
        })
    };
}

// GET page
router.get('/active_tasks', (req, res) => {
    res.render('tt-active-tasks', {
        refreshInterval: 60000 // default 60s
    });
});

// API endpoint (AJAX)
router.get('/api', (req, res) => {
    db.query({ sql: 'CALL tt_active_tasks_list()', timeout: API_QUERY_TIMEOUT_MS }, (err, rows) => {
        if (err) {
            console.error('[tt/active-tasks] Query error:', err);
            return res.status(503).json({
                ts: new Date(),
                o: [],
                error: err.code || err.message || 'Query failed'
            });
        }

        res.json(buildActiveTasksPayload(rows));
    });
});

module.exports = router;
