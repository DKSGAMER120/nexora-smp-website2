/* =========================================================
   NEXORA SMP - LEADERBOARD.JS
   Live Leaderboard / Search / API Handler
   ========================================================= */

"use strict";


/* ---------------------------------------------------------
   CONFIG
   --------------------------------------------------------- */

const NEXORA_LEADERBOARD = {

    api: "/api/leaderboard",

    refreshInterval: 15000,

    requestTimeout: 8000

};


/* ---------------------------------------------------------
   DOM HELPERS
   --------------------------------------------------------- */

function leaderboardElement(id) {

    return document.getElementById(id);

}


/* ---------------------------------------------------------
   SAFE TEXT
   --------------------------------------------------------- */

function leaderboardText(value, fallback = "--") {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return fallback;

    }

    return String(value);

}


/* ---------------------------------------------------------
   HTML ESCAPE
   --------------------------------------------------------- */

function escapeLeaderboardHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ---------------------------------------------------------
   FETCH WITH TIMEOUT
   --------------------------------------------------------- */

async function leaderboardFetch(
    url,
    options = {}
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            NEXORA_LEADERBOARD.requestTimeout
        );


    try {

        const response =
            await fetch(
                url,
                {
                    ...options,
                    signal: controller.signal,
                    cache: "no-store"
                }
            );


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
   NORMALIZE API RESPONSE
   --------------------------------------------------------- */

function normalizeLeaderboardData(data) {

    if (Array.isArray(data)) {

        return data;

    }


    if (
        data &&
        Array.isArray(data.leaderboard)
    ) {

        return data.leaderboard;

    }


    if (
        data &&
        Array.isArray(data.players)
    ) {

        return data.players;

    }


    if (
        data &&
        Array.isArray(data.data)
    ) {

        return data.data;

    }


    return [];

}


/* ---------------------------------------------------------
   NORMALIZE PLAYER
   --------------------------------------------------------- */

function normalizeLeaderboardPlayer(
    player,
    index
) {

    if (
        typeof player === "string"
    ) {

        return {

            rank: index + 1,

            name: player,

            playerRank: "--",

            hearts: "--",

            kills: "--",

            deaths: "--",

            balance: "--"

        };

    }


    if (
        !player ||
        typeof player !== "object"
    ) {

        return {

            rank: index + 1,

            name: "Unknown",

            playerRank: "--",

            hearts: "--",

            kills: "--",

            deaths: "--",

            balance: "--"

        };

    }


    return {

        rank:
            player.position ??
            player.rank_position ??
            player.place ??
            player.number ??
            index + 1,

        name:
            player.name ??
            player.username ??
            player.player_name ??
            player.player ??
            "Unknown",

        playerRank:
            player.server_rank ??
            player.rank_name ??
            player.rank ??
            player.group ??
            "--",

        hearts:
            player.hearts ??
            player.health ??
            player.life ??
            "--",

        kills:
            player.kills ??
            player.kill ??
            0,

        deaths:
            player.deaths ??
            player.death ??
            0,

        balance:
            player.balance ??
            player.money ??
            player.economy ??
            0

    };

}


/* ---------------------------------------------------------
   FORMAT BALANCE
   --------------------------------------------------------- */

function formatLeaderboardBalance(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "--";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return String(value);

    }


    return number.toLocaleString(
        "en-IN"
    );

}


/* ---------------------------------------------------------
   FORMAT HEARTS
   --------------------------------------------------------- */

function formatLeaderboardHearts(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "--";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return String(value);

    }


    return `${number} ❤`;

}


/* ---------------------------------------------------------
   RANK CLASS
   --------------------------------------------------------- */

function getLeaderboardRankClass(
    rank
) {

    const number =
        Number(rank);


    if (number === 1) {

        return "rank-one";

    }


    if (number === 2) {

        return "rank-two";

    }


    if (number === 3) {

        return "rank-three";

    }


    return "";

}


/* ---------------------------------------------------------
   RENDER LEADERBOARD
   --------------------------------------------------------- */

function renderLeaderboard(
    players
) {

    const table =
        leaderboardElement(
            "leaderboardBody"
        );


    if (!table) {

        console.warn(
            "Leaderboard table body not found."
        );

        return;

    }


    if (
        !Array.isArray(players) ||
        players.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    No leaderboard data available.
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        players
            .map(
                (rawPlayer, index) => {

                    const player =
                        normalizeLeaderboardPlayer(
                            rawPlayer,
                            index
                        );


                    const rank =
                        escapeLeaderboardHTML(
                            leaderboardText(
                                player.rank,
                                index + 1
                            )
                        );


                    const name =
                        escapeLeaderboardHTML(
                            leaderboardText(
                                player.name,
                                "Unknown"
                            )
                        );


                    const playerRank =
                        escapeLeaderboardHTML(
                            leaderboardText(
                                player.playerRank
                            )
                        );


                    const hearts =
                        escapeLeaderboardHTML(
                            formatLeaderboardHearts(
                                player.hearts
                            )
                        );


                    const kills =
                        escapeLeaderboardHTML(
                            leaderboardText(
                                player.kills,
                                "0"
                            )
                        );


                    const deaths =
                        escapeLeaderboardHTML(
                            leaderboardText(
                                player.deaths,
                                "0"
                            )
                        );


                    const balance =
                        escapeLeaderboardHTML(
                            formatLeaderboardBalance(
                                player.balance
                            )
                        );


                    const rankClass =
                        getLeaderboardRankClass(
                            player.rank
                        );


                    return `
                        <tr
                            data-player-name="${name.toLowerCase()}"
                            data-player-rank="${playerRank.toLowerCase()}"
                        >

                            <td>
                                <span class="leaderboard-rank ${rankClass}">
                                    ${rank}
                                </span>
                            </td>

                            <td>
                                <div class="leaderboard-player">
                                    <div class="leaderboard-avatar">
                                        ${escapeLeaderboardHTML(
                                            String(player.name)
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div>
                                        <strong>
                                            ${name}
                                        </strong>

                                        <small>
                                            ${playerRank}
                                        </small>
                                    </div>
                                </div>
                            </td>

                            <td>
                                <span class="leaderboard-value hearts">
                                    ${hearts}
                                </span>
                            </td>

                            <td>
                                <span class="leaderboard-value">
                                    ${kills}
                                </span>
                            </td>

                            <td>
                                <span class="leaderboard-value">
                                    ${deaths}
                                </span>
                            </td>

                            <td>
                                <span class="leaderboard-value">
                                    ${balance}
                                </span>
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* ---------------------------------------------------------
   LOADING STATE
   --------------------------------------------------------- */

function showLeaderboardLoading() {

    const table =
        leaderboardElement(
            "leaderboardBody"
        );


    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="empty-state loading"
            >
                Loading Nexora leaderboard...
            </td>
        </tr>
    `;

}


/* ---------------------------------------------------------
   ERROR STATE
   --------------------------------------------------------- */

function showLeaderboardError(
    message = "Unable to load leaderboard."
) {

    const table =
        leaderboardElement(
            "leaderboardBody"
        );


    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="empty-state error-state"
            >
                ${escapeLeaderboardHTML(message)}
            </td>
        </tr>
    `;

}


/* ---------------------------------------------------------
   SEARCH
   --------------------------------------------------------- */

function filterLeaderboard(
    searchValue
) {

    const table =
        leaderboardElement(
            "leaderboardBody"
        );


    if (!table) {
        return;
    }


    const search =
        String(
            searchValue ?? ""
        )
        .trim()
        .toLowerCase();


    const rows =
        table.querySelectorAll(
            "tr[data-player-name]"
        );


    let visibleRows = 0;


    rows.forEach(row => {

        const name =
            row.dataset.playerName || "";


        const rank =
            row.dataset.playerRank || "";


        const matches =
            !search ||
            name.includes(search) ||
            rank.includes(search);


        row.style.display =
            matches
                ? ""
                : "none";


        if (matches) {

            visibleRows++;

        }

    });


    let noResults =
        table.querySelector(
            ".leaderboard-no-results"
        );


    if (
        visibleRows === 0 &&
        rows.length > 0
    ) {

        if (!noResults) {

            noResults =
                document.createElement(
                    "tr"
                );


            noResults.className =
                "leaderboard-no-results";


            noResults.innerHTML = `
                <td
                    colspan="7"
                    class="empty-state"
                >
                    No players match your search.
                </td>
            `;


            table.appendChild(
                noResults
            );

        }

    } else if (noResults) {

        noResults.remove();

    }

}


/* ---------------------------------------------------------
   SEARCH INPUT
   --------------------------------------------------------- */

function initLeaderboardSearch() {

    const search =
        leaderboardElement(
            "leaderboardSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        () => {

            filterLeaderboard(
                search.value
            );

        }
    );

}


/* ---------------------------------------------------------
   REFRESH BUTTON
   --------------------------------------------------------- */

function setRefreshButtonState(
    loading
) {

    const button =
        leaderboardElement(
            "refreshLeaderboard"
        );


    if (!button) {
        return;
    }


    if (loading) {

        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Refreshing...";

    } else {

        button.disabled = false;

        button.textContent =
            button.dataset.originalText ||
            "Refresh";

    }

}


/* ---------------------------------------------------------
   LOAD LEADERBOARD
   --------------------------------------------------------- */

async function loadLeaderboard() {

    showLeaderboardLoading();

    setRefreshButtonState(
        true
    );


    try {

        const response =
            await leaderboardFetch(
                NEXORA_LEADERBOARD.api
            );


        const data =
            await response.json();


        const players =
            normalizeLeaderboardData(
                data
            );


        renderLeaderboard(
            players
        );


        window.NexoraLeaderboardData =
            players;


        const search =
            leaderboardElement(
                "leaderboardSearch"
            );


        if (search && search.value) {

            filterLeaderboard(
                search.value
            );

        }


        return players;

    } catch (error) {

        console.warn(
            "Nexora leaderboard API error:",
            error
        );


        if (
            error.name ===
            "AbortError"
        ) {

            showLeaderboardError(
                "Leaderboard request timed out."
            );

        } else {

            showLeaderboardError(
                "Leaderboard backend is currently unavailable."
            );

        }


        return [];

    } finally {

        setRefreshButtonState(
            false
        );

    }

}


/* ---------------------------------------------------------
   REFRESH BUTTON INITIALIZATION
   --------------------------------------------------------- */

function initLeaderboardRefresh() {

    const button =
        leaderboardElement(
            "refreshLeaderboard"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            loadLeaderboard();

        }
    );

}


/* ---------------------------------------------------------
   AUTO REFRESH
   --------------------------------------------------------- */

let leaderboardRefreshTimer =
    null;


function startLeaderboardRefresh() {

    if (
        leaderboardRefreshTimer !== null
    ) {

        clearInterval(
            leaderboardRefreshTimer
        );

    }


    leaderboardRefreshTimer =
        setInterval(
            () => {

                loadLeaderboard();

            },
            NEXORA_LEADERBOARD.refreshInterval
        );

}


/* ---------------------------------------------------------
   STOP AUTO REFRESH
   --------------------------------------------------------- */

function stopLeaderboardRefresh() {

    if (
        leaderboardRefreshTimer !== null
    ) {

        clearInterval(
            leaderboardRefreshTimer
        );

        leaderboardRefreshTimer = null;

    }

}


/* ---------------------------------------------------------
   VISIBILITY HANDLING
   --------------------------------------------------------- */

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            stopLeaderboardRefresh();

        } else {

            loadLeaderboard();

            startLeaderboardRefresh();

        }

    }
);


/* ---------------------------------------------------------
   INITIALIZE
   --------------------------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const leaderboardBody =
            leaderboardElement(
                "leaderboardBody"
            );


        if (!leaderboardBody) {

            return;

        }


        initLeaderboardSearch();

        initLeaderboardRefresh();

        loadLeaderboard();

        startLeaderboardRefresh();

    }
);


/* ---------------------------------------------------------
   GLOBAL API
   --------------------------------------------------------- */

window.NexoraLeaderboard = {

    config:
        NEXORA_LEADERBOARD,

    load:
        loadLeaderboard,

    search:
        filterLeaderboard,

    start:
        startLeaderboardRefresh,

    stop:
        stopLeaderboardRefresh

};


/* =========================================================
   END OF NEXORA LEADERBOARD.JS
   ========================================================= */