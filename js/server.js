/* =========================================================
   NEXORA SMP - SERVER.JS
   Live Server Status / API Handler
   ========================================================= */

"use strict";


/* ---------------------------------------------------------
   NEXORA SERVER CONFIG
   --------------------------------------------------------- */

const NEXORA_SERVER = {

    ip: "play.nexorasmp.2bd.net",

    api: {
        server: "/api/server",
        players: "/api/players"
    },

    refreshInterval: 15000,

    requestTimeout: 8000

};


/* ---------------------------------------------------------
   DOM HELPERS
   --------------------------------------------------------- */

function serverElement(id) {

    return document.getElementById(id);

}


/* ---------------------------------------------------------
   SAFE TEXT
   --------------------------------------------------------- */

function setServerText(id, value) {

    const element = serverElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "--"
            : String(value);

}


/* ---------------------------------------------------------
   SAFE HTML ESCAPE
   --------------------------------------------------------- */

function escapeServerHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ---------------------------------------------------------
   REQUEST WITH TIMEOUT
   --------------------------------------------------------- */

async function nexoraFetch(url, options = {}) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            NEXORA_SERVER.requestTimeout
        );


    try {

        const response =
            await fetch(url, {
                ...options,
                signal: controller.signal,
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        return response;

    } finally {

        clearTimeout(timeout);

    }

}


/* ---------------------------------------------------------
   NORMALIZE SERVER DATA
   --------------------------------------------------------- */

function normalizeServerData(data) {

    const source =
        data && typeof data === "object"
            ? data
            : {};


    const players =
        source.players &&
        typeof source.players === "object"
            ? source.players
            : {};


    const online =
        source.online ??
        source.status === "online" ??
        false;


    const playerCount =
        players.online ??
        source.player_count ??
        source.players_online ??
        source.online_players ??
        0;


    const maxPlayers =
        players.max ??
        source.max_players ??
        source.maxPlayers ??
        0;


    let playerList =
        players.list ??
        source.players_list ??
        source.player_list ??
        [];


    if (!Array.isArray(playerList)) {

        playerList = [];

    }


    return {

        online: Boolean(online),

        playerCount:
            Number(playerCount) || 0,

        maxPlayers:
            Number(maxPlayers) || 0,

        latency:
            source.latency ??
            source.ping ??
            null,

        version:
            source.version ??
            "Unknown",

        motd:
            source.motd ??
            "Nexora SMP",

        playerList

    };

}


/* ---------------------------------------------------------
   STATUS INDICATOR
   --------------------------------------------------------- */

function updateServerStatus(data) {

    const dot =
        serverElement("statusDot");

    const statusText =
        serverElement("statusText");

    const infoStatus =
        serverElement("infoStatus");


    if (data.online) {

        setServerText(
            "statusText",
            "Online"
        );

        setServerText(
            "infoStatus",
            "Online"
        );


        if (dot) {

            dot.style.background =
                "#39e58c";

            dot.style.boxShadow =
                "0 0 16px #39e58c";

        }

    } else {

        setServerText(
            "statusText",
            "Offline"
        );

        setServerText(
            "infoStatus",
            "Offline"
        );


        if (dot) {

            dot.style.background =
                "#ff526d";

            dot.style.boxShadow =
                "0 0 16px #ff526d";

        }

    }

}


/* ---------------------------------------------------------
   PLAYER COUNT
   --------------------------------------------------------- */

function updatePlayerCount(data) {

    const count =
        data.playerCount;

    const element =
        serverElement("playerCount");


    if (!element) {
        return;
    }


    if (data.maxPlayers > 0) {

        element.innerHTML =
            `${escapeServerHTML(count)} ` +
            `<small> / ${escapeServerHTML(data.maxPlayers)} players online</small>`;

    } else {

        element.innerHTML =
            `${escapeServerHTML(count)} ` +
            `<small>players online</small>`;

    }

}


/* ---------------------------------------------------------
   LATENCY
   --------------------------------------------------------- */

function updateLatency(data, measuredLatency) {

    const latency =
        data.latency ??
        measuredLatency;


    if (
        latency === null ||
        latency === undefined ||
        Number.isNaN(Number(latency))
    ) {

        setServerText(
            "latency",
            "-- ms"
        );

        return;

    }


    setServerText(
        "latency",
        `${Math.round(Number(latency))} ms`
    );

}


/* ---------------------------------------------------------
   ONLINE PLAYERS
   --------------------------------------------------------- */

function updateOnlinePlayers(playerList) {

    const container =
        serverElement("players");


    if (!container) {
        return;
    }


    if (!Array.isArray(playerList) ||
        playerList.length === 0) {

        container.innerHTML =
            `<div class="empty">
                No players online
            </div>`;

        return;

    }


    container.innerHTML =
        playerList
            .map(player => {

                let name = "";

                let rank =
                    "Online player";


                if (
                    typeof player === "string"
                ) {

                    name = player;

                } else if (
                    player &&
                    typeof player === "object"
                ) {

                    name =
                        player.name ??
                        player.username ??
                        player.player_name ??
                        "Unknown Player";

                    rank =
                        player.rank ??
                        "Online player";

                }


                const safeName =
                    escapeServerHTML(name);

                const safeRank =
                    escapeServerHTML(rank);


                const firstLetter =
                    escapeServerHTML(
                        String(name)
                            .charAt(0)
                            .toUpperCase()
                    );


                return `
                    <div class="player">
                        <div class="avatar">
                            ${firstLetter}
                        </div>

                        <div>
                            <div class="player-name">
                                ${safeName}
                            </div>

                            <div class="player-rank">
                                ${safeRank}
                            </div>
                        </div>
                    </div>
                `;

            })
            .join("");

}


/* ---------------------------------------------------------
   SERVER INFORMATION
   --------------------------------------------------------- */

function updateServerInformation(data) {

    const version =
        serverElement("serverVersion");

    const motd =
        serverElement("serverMotd");


    if (version) {

        version.textContent =
            data.version;

    }


    if (motd) {

        motd.textContent =
            data.motd;

    }

}


/* ---------------------------------------------------------
   BACKEND ERROR STATE
   --------------------------------------------------------- */

function setBackendOffline(message = "Backend offline") {

    setServerText(
        "statusText",
        message
    );

    setServerText(
        "infoStatus",
        "Waiting for API"
    );

    const dot =
        serverElement("statusDot");


    if (dot) {

        dot.style.background =
            "#ffb347";

        dot.style.boxShadow =
            "0 0 16px #ffb347";

    }


    const count =
        serverElement("playerCount");


    if (count) {

        count.innerHTML =
            `-- <small>players online</small>`;

    }


    setServerText(
        "latency",
        "-- ms"
    );


    const players =
        serverElement("players");


    if (players) {

        players.innerHTML =
            `<div class="empty">
                Live player data will appear when the Nexora backend is connected.
            </div>`;

    }

}


/* ---------------------------------------------------------
   LOAD SERVER STATUS
   --------------------------------------------------------- */

async function loadNexoraServerStatus() {

    const startTime =
        performance.now();


    try {

        const response =
            await nexoraFetch(
                NEXORA_SERVER.api.server
            );


        const data =
            await response.json();


        const measuredLatency =
            Math.round(
                performance.now() -
                startTime
            );


        const serverData =
            normalizeServerData(data);


        updateServerStatus(
            serverData
        );


        updatePlayerCount(
            serverData
        );


        updateLatency(
            serverData,
            measuredLatency
        );


        updateOnlinePlayers(
            serverData.playerList
        );


        updateServerInformation(
            serverData
        );


        window.NexoraServerData =
            serverData;


        return serverData;

    } catch (error) {

        console.warn(
            "Nexora server API error:",
            error
        );


        setBackendOffline(
            error.name === "AbortError"
                ? "API timeout"
                : "Backend offline"
        );


        return null;

    }

}


/* ---------------------------------------------------------
   LOAD PLAYER LIST SEPARATELY
   --------------------------------------------------------- */

async function loadNexoraPlayers() {

    try {

        const response =
            await nexoraFetch(
                NEXORA_SERVER.api.players
            );


        const data =
            await response.json();


        let players = [];


        if (Array.isArray(data)) {

            players = data;

        } else if (
            Array.isArray(data.players)
        ) {

            players = data.players;

        } else if (
            Array.isArray(data.player_list)
        ) {

            players = data.player_list;

        } else if (
            Array.isArray(data.players_list)
        ) {

            players = data.players_list;

        }


        updateOnlinePlayers(
            players
        );


        return players;

    } catch (error) {

        console.warn(
            "Nexora players API error:",
            error
        );


        return [];

    }

}


/* ---------------------------------------------------------
   COPY SERVER IP
   --------------------------------------------------------- */

async function copyNexoraServerIP() {

    const ip =
        NEXORA_SERVER.ip;


    try {

        await navigator.clipboard.writeText(
            ip
        );


        if (
            window.Nexora &&
            typeof window.Nexora.toast === "function"
        ) {

            window.Nexora.toast(
                "Server IP copied!"
            );

        } else {

            alert(
                "Server IP copied!"
            );

        }

    } catch (error) {

        console.warn(
            "Clipboard error:",
            error
        );


        alert(
            `Server IP: ${ip}`
        );

    }

}


/* ---------------------------------------------------------
   AUTO REFRESH
   --------------------------------------------------------- */

let nexoraServerRefreshTimer = null;


function startNexoraServerRefresh() {

    if (
        nexoraServerRefreshTimer !== null
    ) {

        clearInterval(
            nexoraServerRefreshTimer
        );

    }


    nexoraServerRefreshTimer =
        setInterval(
            () => {

                loadNexoraServerStatus();

            },
            NEXORA_SERVER.refreshInterval
        );

}


/* ---------------------------------------------------------
   STOP AUTO REFRESH
   --------------------------------------------------------- */

function stopNexoraServerRefresh() {

    if (
        nexoraServerRefreshTimer !== null
    ) {

        clearInterval(
            nexoraServerRefreshTimer
        );

        nexoraServerRefreshTimer = null;

    }

}


/* ---------------------------------------------------------
   PAGE VISIBILITY
   --------------------------------------------------------- */

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            stopNexoraServerRefresh();

        } else {

            loadNexoraServerStatus();

            startNexoraServerRefresh();

        }

    }
);


/* ---------------------------------------------------------
   INITIALIZE SERVER SYSTEM
   --------------------------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const serverPage =
            document.getElementById(
                "status"
            );


        /*
         * Only start the live server
         * system when status elements
         * exist on the current page.
         */

        if (
            serverPage ||
            serverElement("statusText") ||
            serverElement("playerCount")
        ) {

            loadNexoraServerStatus();

            startNexoraServerRefresh();

        }


        document
            .querySelectorAll(
                "[data-copy-server-ip], .copy-server-ip"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        copyNexoraServerIP();

                    }
                );

            });

    }
);


/* ---------------------------------------------------------
   GLOBAL API
   --------------------------------------------------------- */

window.NexoraServer = {

    config:
        NEXORA_SERVER,

    refresh:
        loadNexoraServerStatus,

    loadPlayers:
        loadNexoraPlayers,

    copyIP:
        copyNexoraServerIP,

    start:
        startNexoraServerRefresh,

    stop:
        stopNexoraServerRefresh

};


/* =========================================================
   END OF NEXORA SERVER.JS
   ========================================================= */