var url = "/tt/active-tasks";

const ITEM_DISPLAY_TIME = 10000;
const ORDER_END_PAUSE_MS = 2500;
const LAST_ORDER_PAUSE_MS = 7000;
const REFRESH_AFTER_MS = 300000;
const FULL_PAGE_RELOAD_AFTER_MS = 12 * 60 * 60 * 1000;

let currentData = [];
let currentOrderIndex = 0;
let pageStartTime = Date.now();
let huScrollTimer = null;
let huScrollDurationMs = 0;

const ordersListEl = document.getElementById('ordersList');
const huListEl = document.getElementById('huList');
const activeOrderTitleEl = document.getElementById('activeOrderTitle');
const activeProductTitleEl = document.getElementById('activeProductTitle');

function autoScrollContainer(container) {

    if (!container) return;

    container.scrollTop = 0;

    const maxScroll =
        container.scrollHeight -
        container.clientHeight;

    if (maxScroll <= 0) {
        huScrollDurationMs = 0;
        return 0;
    }

    const pixelsPerSecond = 42;
    huScrollDurationMs = (maxScroll / pixelsPerSecond) * 1000;
    let position = 0;
    let lastFrame = performance.now();

    function tick(now) {
        const delta = now - lastFrame;
        lastFrame = now;

        position = Math.min(
            position + (pixelsPerSecond * delta / 1000),
            maxScroll
        );
        container.scrollTop = position;

        if (position < maxScroll) {
            huScrollTimer = requestAnimationFrame(tick);
        }
    }

    huScrollTimer = requestAnimationFrame(tick);
    return huScrollDurationMs;

}

function startHuAutoScroll() {

    cancelAnimationFrame(huScrollTimer);
    huScrollTimer = null;
    document.body.classList.remove('is-paused');

    autoScrollContainer(huListEl);

}

function updateTimestamp(ts) {

    const el =
        document.getElementById('lastRefresh');

    el.classList.remove('error-status');

    el.innerText =
        new Date(ts).toLocaleTimeString(
            [],
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }
        );
}

function fetchData() {

    fetch(url + '/api')
        .then(r => r.json())
        .then(res => {

            currentData = Array.isArray(res.o) ? res.o : [];

            updateTimestamp(res.ts);

            updateStats();

            renderOrders();

            pageStartTime = Date.now();

            if (currentData.length) {
                showOrder(0);
            }

        })
        .catch(showConnectionError);

}

function updateStats() {

    let huCount = 0;

    currentData.forEach(o => {
        huCount += Array.isArray(o[2]) ? o[2].length : 0;
    });

    document.getElementById('ordersCount')
        .innerText = currentData.length;

    document.getElementById('huCount')
        .innerText = huCount;
}

function renderOrders() {

    ordersListEl.innerHTML = '';

    currentData.forEach((order, index) => {

        const el =
            document.createElement('div');

        el.className = 'order-item';
        el.dataset.index = index;

        el.innerHTML = `
            <div class="order-item-header">
                ${order[0]}
            </div>

            <div class="order-progress-row">
                <div class="order-progress-bar">
                    <div class="order-progress-fill"
                         style="width:${order[1]}%">
                    </div>
                </div>

                <div class="order-progress-percent">
                    ${order[1]}%
                </div>
            </div>
        `;

        ordersListEl.appendChild(el);

    });

}

function renderHus(orderIndex) {

    huListEl.innerHTML = '';

    const order =
        currentData[orderIndex] || [];

    const hus =
        Array.isArray(order[2]) ? order[2] : [];

    let activeHu = null;

    hus.forEach(hu => {

        const active =
            hu[2] &&
            hu[2].trim() !== '';
        const completed =
            Number(hu[1]) >= 100;

        if (active && !activeHu) {
            activeHu = hu;
        }

        const el =
            document.createElement('div');

        el.className = 'hu-item';
        if (active) {
            el.classList.add('active');
        }
        if (completed) {
            el.classList.add('completed');
        }

        el.innerHTML = `
            <div class="hu-row">

                <div class="hu-code">
                    ${hu[0]}
                </div>

                ${completed ? `
                    <span class="hu-complete-badge"
                          style="display:inline-flex;align-items:center;justify-content:center;min-width:94px;margin-left:auto;padding:6px 14px;border-radius:999px;background:linear-gradient(180deg,#7be59a 0%,#43aa5c 100%);border:2px solid #86e09a;box-shadow:0 0 0 1px rgba(0,0,0,0.15),0 0 12px rgba(91,207,115,0.28);color:#08180d;font-size:0.78rem;font-weight:900;line-height:1;text-transform:uppercase;letter-spacing:0;white-space:nowrap;flex:0 0 auto;">
                      Complete
                    </span>
                ` : `
                    <div class="hu-progress-bar">
                        <div
                            class="hu-progress-fill"
                            style="width:${hu[1]}%">
                        </div>
                    </div>

                    <div class="hu-percent">
                        ${hu[1]}%
                    </div>
                `}

            </div>

            ${active ? `
            <div class="hu-active-details">

                <div>
                    <span>Worker:</span>
                    ${hu[2]}
                </div>

                <div>
                    <span>Place:</span>
                    ${hu[4]}
                </div>

                <div>
                    <span>Step:</span>
                    ${hu[3]}
                </div>

            </div>
            ` : ''}            
        `;
        huListEl.appendChild(el);

    });

}

function showOrder(index) {

    currentOrderIndex = index;

    const order =
        currentData[index];

    activeOrderTitleEl.innerText =
        order[0];

    if (activeProductTitleEl) {
        activeProductTitleEl.innerText =
            order[3] || '';
    }

    const hus =
        Array.isArray(order[2]) ? order[2] : [];

    const totalHus = hus.length;
    let activeHus = 0;
    let completedHus = 0;

    hus.forEach(hu => {
        if (hu[2] && hu[2].trim() !== '') {
            activeHus += 1;
        }

        if (Number(hu[1]) >= 100) {
            completedHus += 1;
        }
    });

    document.getElementById(
        'orderTotalHus'
    ).innerText =
        totalHus;

    document.getElementById(
        'orderActiveHus'
    ).innerText =
        activeHus;

    document.getElementById(
        'orderCompletedHus'
    ).innerText =
        completedHus;

    renderHus(index);

    const orderElements =
        document.querySelectorAll('.order-item');

    orderElements.forEach((el, i) => {
        if (i === index) {
            
            el.classList.add('active');
            
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

        } else {

            el.classList.remove('active');

        }

    });
    
    document
        .querySelector(
            `.order-item[data-index="${index}"]`
        )
        ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

    const progress =
        ((index + 1) /
         currentData.length) * 100;

    document
        .getElementById('pageProgress')
        .style.width =
        progress + '%';

    document
        .getElementById('pageInfo')
        .innerText =
        `${index + 1} / ${currentData.length}`;

    document.getElementById(
        'activeOrderProgress'
    ).style.width =
        order[1] + '%';

    document.getElementById(
        'activeOrderProgressText'
    ).innerText =
        order[1] + '%';

    startHuAutoScroll();
    
    clearTimeout(window.orderTimer);

    const isLastOrder =
        index >= currentData.length - 1;
    const holdMs =
        Math.max(
            ITEM_DISPLAY_TIME,
            huScrollDurationMs
        ) +
        (isLastOrder ? LAST_ORDER_PAUSE_MS : ORDER_END_PAUSE_MS);

    window.orderTimer =
        setTimeout(() => {
            document.body.classList.add('is-paused');

            let next =
                index + 1;

            if (
                next >=
                currentData.length
            ) {

                if (
                    Date.now() -
                    pageStartTime >
                    REFRESH_AFTER_MS
                ) {

                    fetchData();
                    return;
                }

                next = 0;
            }

            showOrder(next);

        }, holdMs);

}

function showConnectionError() {

    const el =
        document.getElementById(
            'lastRefresh'
        );

    el.innerText = 'ERROR';
    el.classList.add(
        'error-status'
    );
}

document.addEventListener(
    'contextmenu',
    e => e.preventDefault()
);

window.fullPageReloadTimer = setTimeout(() => {
    window.location.reload();
}, FULL_PAGE_RELOAD_AFTER_MS);

fetchData();

setInterval(() => {

    if (
        Date.now() -
        pageStartTime >
        REFRESH_AFTER_MS
    ) {

        fetchData();
    }

}, 60000);
