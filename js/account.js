/* =========================================================
   NEXORA SMP — ACCOUNT.JS
   Player account / profile dashboard
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const NEXORA_ACCOUNT = {
    api: {
        player: "/api/player/",
        stats: "/api/player/",
        inventory: "/api/player/"
    },

    requestTimeout: 8000,
    refreshInterval: 15000,

    storageKey: "nexora_player"
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function accountEl(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


/* =========================================================
   SAFE TEXT
   ========================================================= */

function accountEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function accountNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}


function formatNumber(value) {
    return accountNumber(value).toLocaleString("en-IN");
}


function formatBalance(value) {
    const number = accountNumber(value);

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}


/* =========================================================
   FETCH WITH TIMEOUT
   ========================================================= */

async function accountFetch(url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, NEXORA_ACCOUNT.requestTimeout);

    try {
        const response = await fetch(url, {
            ...options,
            cache: "no-store",
            signal: controller.signal
        });

        return response;
    } finally {
        clearTimeout(timeout);
    }
}


/* =========================================================
   CURRENT PLAYER
   ========================================================= */

function getCurrentPlayer() {
    const player = sessionStorage.getItem(
        NEXORA_ACCOUNT.storageKey
    );

    if (!player) {
        return null;
    }

    return player.trim();
}


/* =========================================================
   LOGIN CHECK
   ========================================================= */

function requirePlayerLogin() {
    const player = getCurrentPlayer();

    if (!player) {
        window.location.href = "login.html";
        return null;
    }

    return player;
}


/* =========================================================
   API URL
   ========================================================= */

function playerApiUrl(player, endpoint = "") {
    return (
        NEXORA_ACCOUNT.api.player +
        encodeURIComponent(player) +
        endpoint
    );
}


/* =========================================================
   NORMALIZE PLAYER DATA
   ========================================================= */

function normalizePlayerData(raw) {
    const data = raw?.data ?? raw?.player ?? raw ?? {};

    const stats =
        data.stats ??
        data.statistics ??
        {};

    const economy =
        data.economy ??
        {};

    const lifesteal =
        data.lifesteal ??
        {};

    return {
        name:
            data.name ??
            data.username ??
            data.player_name ??
            data.player ??
            "Unknown Player",

        uuid:
            data.uuid ??
            data.unique_id ??
            "",

        rank:
            data.rank ??
            data.server_rank ??
            data.group ??
            data.permission_group ??
            "Player",

        hearts:
            data.hearts ??
            data.health ??
            data.life ??
            lifesteal.hearts ??
            0,

        maxHearts:
            data.max_hearts ??
            data.maxHealth ??
            lifesteal.max_hearts ??
            data.hearts ??
            0,

        kills:
            data.kills ??
            stats.kills ??
            0,

        deaths:
            data.deaths ??
            stats.deaths ??
            0,

        balance:
            data.balance ??
            data.money ??
            economy.balance ??
            economy.money ??
            0,

        playtime:
            data.playtime ??
            data.play_time ??
            stats.playtime ??
            "Unknown",

        online:
            data.online ??
            false,

        firstJoin:
            data.first_join ??
            data.firstJoin ??
            data.joined ??
            "Unknown",

        lastSeen:
            data.last_seen ??
            data.lastSeen ??
            "Unknown",

        inventory:
            data.inventory ??
            [],

        activity:
            data.activity ??
            data.activities ??
            []
    };
}


/* =========================================================
   UPDATE PLAYER NAME
   ========================================================= */

function updatePlayerName(player) {
    const elements = [
        accountEl(
            "playerName",
            "accountPlayerName",
            "profileName",
            "username"
        ),

        accountEl(
            "playerUsername",
            "accountUsername"
        )
    ];

    elements.forEach(element => {
        if (element) {
            element.textContent = player;
        }
    });
}


/* =========================================================
   UPDATE RANK
   ========================================================= */

function updateRank(rank) {
    const element = accountEl(
        "playerRank",
        "accountRank",
        "profileRank",
        "rank"
    );

    if (element) {
        element.textContent = rank;
    }
}


/* =========================================================
   UPDATE HEARTS
   ========================================================= */

function updateHearts(hearts, maxHearts) {
    const heartValue = accountEl(
        "heartValue",
        "heartsValue",
        "playerHearts",
        "hearts"
    );

    if (heartValue) {
        if (
            maxHearts &&
            Number(maxHearts) !== Number(hearts)
        ) {
            heartValue.textContent =
                `${hearts} / ${maxHearts} ❤`;
        } else {
            heartValue.textContent =
                `${hearts} ❤`;
        }
    }

    const heartContainer = accountEl(
        "heartDisplay",
        "heartsDisplay",
        "hearts"
    );

    if (!heartContainer) {
        return;
    }

    /*
     * Only render visual hearts if the container
     * is specifically intended for the display.
     */
    if (
        heartContainer.id === "heartDisplay" ||
        heartContainer.id === "heartsDisplay"
    ) {
        const count = Math.max(
            0,
            Math.min(40, Math.floor(Number(hearts) || 0))
        );

        heartContainer.innerHTML =
            Array.from(
                { length: count },
                () => '<span class="heart">❤</span>'
            ).join("");
    }
}


/* =========================================================
   UPDATE KILLS
   ========================================================= */

function updateKills(kills) {
    const element = accountEl(
        "kills",
        "killCount",
        "playerKills",
        "statKills"
    );

    if (element) {
        element.textContent = formatNumber(kills);
    }
}


/* =========================================================
   UPDATE DEATHS
   ========================================================= */

function updateDeaths(deaths) {
    const element = accountEl(
        "deaths",
        "deathCount",
        "playerDeaths",
        "statDeaths"
    );

    if (element) {
        element.textContent = formatNumber(deaths);
    }
}


/* =========================================================
   UPDATE BALANCE
   ========================================================= */

function updateBalance(balance) {
    const element = accountEl(
        "balance",
        "money",
        "playerBalance",
        "statBalance"
    );

    if (element) {
        element.textContent =
            `$${formatBalance(balance)}`;
    }
}


/* =========================================================
   UPDATE PLAYTIME
   ========================================================= */

function updatePlaytime(playtime) {
    const element = accountEl(
        "playtime",
        "playerPlaytime",
        "statPlaytime"
    );

    if (element) {
        element.textContent =
            playtime || "Unknown";
    }
}


/* =========================================================
   UPDATE ONLINE STATUS
   ========================================================= */

function updateOnlineStatus(online) {
    const element = accountEl(
        "onlineStatus",
        "playerStatus",
        "accountStatus"
    );

    if (!element) {
        return;
    }

    element.textContent =
        online ? "Online" : "Offline";

    element.classList.toggle(
        "online",
        Boolean(online)
    );

    element.classList.toggle(
        "offline",
        !online
    );
}


/* =========================================================
   UPDATE FIRST JOIN
   ========================================================= */

function updateFirstJoin(value) {
    const element = accountEl(
        "firstJoin",
        "joined",
        "joinDate"
    );

    if (element) {
        element.textContent =
            value || "Unknown";
    }
}


/* =========================================================
   UPDATE LAST SEEN
   ========================================================= */

function updateLastSeen(value) {
    const element = accountEl(
        "lastSeen",
        "lastOnline"
    );

    if (element) {
        element.textContent =
            value || "Unknown";
    }
}


/* =========================================================
   INVENTORY
   ========================================================= */

function normalizeInventory(inventory) {
    if (!Array.isArray(inventory)) {
        return [];
    }

    return inventory.map((item, index) => {
        if (!item) {
            return {
                slot: index,
                name: "",
                amount: 0,
                material: "",
                icon: ""
            };
        }

        if (typeof item === "string") {
            return {
                slot: index,
                name: item,
                amount: 1,
                material: item,
                icon: ""
            };
        }

        return {
            slot:
                item.slot ??
                index,

            name:
                item.name ??
                item.display_name ??
                item.displayName ??
                item.material ??
                item.type ??
                "",

            amount:
                item.amount ??
                item.count ??
                item.quantity ??
                0,

            material:
                item.material ??
                item.type ??
                "",

            icon:
                item.icon ??
                item.image ??
                ""
        };
    });
}


/* =========================================================
   RENDER INVENTORY
   ========================================================= */

function renderInventory(inventory) {
    const container = accountEl(
        "inventory",
        "inventoryGrid",
        "playerInventory"
    );

    if (!container) {
        return;
    }

    const items = normalizeInventory(inventory);

    if (!items.length) {
        container.innerHTML =
            '<div class="empty-state">Inventory data unavailable.</div>';

        return;
    }

    container.innerHTML = items
        .map(item => {
            const name = accountEscape(item.name);
            const amount = accountNumber(item.amount);

            const icon =
                item.icon
                    ? `<img src="${accountEscape(
                        item.icon
                    )}" alt="${name}" loading="lazy">`
                    : `<span class="inventory-item-icon">📦</span>`;

            return `
                <div class="slot inventory-slot"
                     data-slot="${accountEscape(item.slot)}"
                     title="${name}">
                    <div class="slot-icon">
                        ${icon}
                    </div>
                    <div class="slot-name">
                        ${name || "Empty"}
                    </div>
                    ${
                        amount > 0
                            ? `<span class="slot-count">${amount}</span>`
                            : ""
                    }
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   ACTIVITY
   ========================================================= */

function renderActivity(activity) {
    const container = accountEl(
        "activityList",
        "activities",
        "playerActivity"
    );

    if (!container) {
        return;
    }

    if (!Array.isArray(activity) || !activity.length) {
        container.innerHTML =
            '<div class="empty-state">No recent activity.</div>';

        return;
    }

    container.innerHTML = activity
        .slice(0, 20)
        .map(entry => {
            if (typeof entry === "string") {
                return `
                    <div class="activity">
                        <div class="activity-text">
                            ${accountEscape(entry)}
                        </div>
                    </div>
                `;
            }

            const title =
                entry.title ??
                entry.action ??
                entry.type ??
                "Activity";

            const description =
                entry.description ??
                entry.message ??
                "";

            const time =
                entry.time ??
                entry.date ??
                entry.timestamp ??
                "";

            return `
                <div class="activity">
                    <div class="activity-icon">•</div>
                    <div>
                        <div class="activity-title">
                            ${accountEscape(title)}
                        </div>

                        ${
                            description
                                ? `<div class="activity-text">
                                    ${accountEscape(description)}
                                   </div>`
                                : ""
                        }

                        ${
                            time
                                ? `<div class="activity-time">
                                    ${accountEscape(time)}
                                   </div>`
                                : ""
                        }
                    </div>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function showAccountLoading() {
    const elements = document.querySelectorAll(
        ".account-loading"
    );

    elements.forEach(element => {
        element.style.display = "";
    });
}


/* =========================================================
   HIDE LOADING STATE
   ========================================================= */

function hideAccountLoading() {
    const elements = document.querySelectorAll(
        ".account-loading"
    );

    elements.forEach(element => {
        element.style.display = "none";
    });
}


/* =========================================================
   ERROR STATE
   ========================================================= */

function showAccountError(message) {
    const element = accountEl(
        "accountError",
        "profileError",
        "accountErrorMessage"
    );

    if (!element) {
        return;
    }

    element.textContent =
        message ||
        "Unable to load your Nexora account.";

    element.style.display = "block";
}


/* =========================================================
   HIDE ERROR
   ========================================================= */

function hideAccountError() {
    const element = accountEl(
        "accountError",
        "profileError",
        "accountErrorMessage"
    );

    if (element) {
        element.style.display = "none";
    }
}


/* =========================================================
   RENDER COMPLETE ACCOUNT
   ========================================================= */

function renderAccount(data) {
    const player = normalizePlayerData(data);

    updatePlayerName(player.name);
    updateRank(player.rank);

    updateHearts(
        player.hearts,
        player.maxHearts
    );

    updateKills(player.kills);
    updateDeaths(player.deaths);
    updateBalance(player.balance);
    updatePlaytime(player.playtime);

    updateOnlineStatus(player.online);

    updateFirstJoin(player.firstJoin);
    updateLastSeen(player.lastSeen);

    renderInventory(player.inventory);
    renderActivity(player.activity);
}


/* =========================================================
   LOAD PLAYER PROFILE
   ========================================================= */

async function loadPlayerAccount(player) {
    if (!player) {
        return false;
    }

    showAccountLoading();
    hideAccountError();

    try {
        const response = await accountFetch(
            playerApiUrl(player)
        );

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to load player account."
            );
        }

        renderAccount(data);

        return true;

    } catch (error) {
        console.error(
            "[Nexora Account]",
            error
        );

        showAccountError(
            error.name === "AbortError"
                ? "The Nexora backend took too long to respond."
                : error.message ||
                  "Unable to load account data."
        );

        return false;

    } finally {
        hideAccountLoading();
    }
}


/* =========================================================
   LOAD STATS
   ========================================================= */

async function loadPlayerStats(player) {
    if (!player) {
        return null;
    }

    try {
        const response = await accountFetch(
            playerApiUrl(
                player,
                "/stats"
            )
        );

        if (!response.ok) {
            return null;
        }

        const data =
            await response.json().catch(() => ({}));

        const stats =
            data.stats ??
            data.data ??
            data;

        if (stats.kills !== undefined) {
            updateKills(stats.kills);
        }

        if (stats.deaths !== undefined) {
            updateDeaths(stats.deaths);
        }

        if (stats.playtime !== undefined) {
            updatePlaytime(stats.playtime);
        }

        if (stats.hearts !== undefined) {
            updateHearts(
                stats.hearts,
                stats.max_hearts
            );
        }

        if (stats.balance !== undefined) {
            updateBalance(stats.balance);
        }

        return stats;

    } catch (error) {
        console.warn(
            "[Nexora Account] Stats:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD INVENTORY
   ========================================================= */

async function loadPlayerInventory(player) {
    if (!player) {
        return null;
    }

    try {
        const response = await accountFetch(
            playerApiUrl(
                player,
                "/inventory"
            )
        );

        if (!response.ok) {
            return null;
        }

        const data =
            await response.json().catch(() => ({}));

        const inventory =
            data.inventory ??
            data.items ??
            data.data ??
            [];

        renderInventory(inventory);

        return inventory;

    } catch (error) {
        console.warn(
            "[Nexora Account] Inventory:",
            error
        );

        return null;
    }
}


/* =========================================================
   REFRESH ACCOUNT
   ========================================================= */

async function refreshAccount() {
    const player = getCurrentPlayer();

    if (!player) {
        window.location.href = "login.html";
        return;
    }

    updatePlayerName(player);

    await loadPlayerAccount(player);

    /*
     * These endpoints are optional.
     * If the main /api/player endpoint already returns
     * stats/inventory, the extra requests simply return
     * null and do not break the account page.
     */
    await Promise.all([
        loadPlayerStats(player),
        loadPlayerInventory(player)
    ]);
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutNexora() {
    sessionStorage.removeItem(
        NEXORA_ACCOUNT.storageKey
    );

    window.location.href = "login.html";
}


/* =========================================================
   VISIBILITY HANDLING
   ========================================================= */

let accountRefreshTimer = null;


function startAccountRefresh() {
    if (accountRefreshTimer) {
        clearInterval(accountRefreshTimer);
    }

    accountRefreshTimer =
        setInterval(
            refreshAccount,
            NEXORA_ACCOUNT.refreshInterval
        );
}


function stopAccountRefresh() {
    if (accountRefreshTimer) {
        clearInterval(accountRefreshTimer);

        accountRefreshTimer = null;
    }
}


document.addEventListener(
    "visibilitychange",
    () => {
        if (document.hidden) {
            stopAccountRefresh();
        } else {
            refreshAccount();
            startAccountRefresh();
        }
    }
);


/* =========================================================
   LOGOUT BUTTON SUPPORT
   ========================================================= */

document.addEventListener(
    "click",
    event => {
        const target =
            event.target.closest(
                "[data-nexora-logout]"
            );

        if (!target) {
            return;
        }

        event.preventDefault();

        logoutNexora();
    }
);


/* =========================================================
   MANUAL REFRESH BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    event => {
        const target =
            event.target.closest(
                "#refreshAccount, [data-refresh-account]"
            );

        if (!target) {
            return;
        }

        event.preventDefault();

        refreshAccount();
    }
);


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const player =
            requirePlayerLogin();

        if (!player) {
            return;
        }

        updatePlayerName(player);

        refreshAccount();

        startAccountRefresh();
    }
);


/* =========================================================
   GLOBAL API
   ========================================================= */

window.NexoraAccount = {
    config: NEXORA_ACCOUNT,
    getCurrentPlayer,
    refresh: refreshAccount,
    logout: logoutNexora,
    loadPlayer: loadPlayerAccount,
    loadStats: loadPlayerStats,
    loadInventory: loadPlayerInventory
};