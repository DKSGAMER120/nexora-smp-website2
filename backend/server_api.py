# backend/server_api.py

"""
NEXORA SMP - Server API
=======================

This module provides the data layer used by backend/app.py.

Functions exposed to app.py:

    get_server_status()
    get_online_players()
    get_leaderboard()
    get_player_data(player_name)
    get_player_stats(player_name)
    get_player_inventory(player_name)

IMPORTANT:
-----------
This file does NOT fake live Minecraft data.

Until a real Minecraft -> Python data bridge is connected,
the functions return safe fallback data.

Possible future data sources:
    - Nexora Minecraft plugin
    - Skript-generated JSON
    - SQLite/MySQL database
    - RCON bridge
    - HTTP bridge from the Minecraft server
"""

from __future__ import annotations

import os
import json
import time
from pathlib import Path
from typing import Any


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = Path(
    os.getenv(
        "NEXORA_DATA_DIR",
        str(BASE_DIR / "data")
    )
)

DATA_DIR.mkdir(parents=True, exist_ok=True)


SERVER_DATA_FILE = DATA_DIR / "server.json"
PLAYERS_DATA_FILE = DATA_DIR / "players.json"
LEADERBOARD_DATA_FILE = DATA_DIR / "leaderboard.json"


# Minecraft server address displayed by the website.
NEXORA_SERVER_IP = os.getenv(
    "NEXORA_SERVER_IP",
    "play.nexorasmp.2bd.net"
)

NEXORA_SERVER_PORT = int(
    os.getenv(
        "NEXORA_SERVER_PORT",
        "25565"
    )
)


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _read_json(
    file_path: Path,
    default: Any
) -> Any:
    """
    Safely read a JSON file.

    If the file does not exist, contains invalid JSON,
    or cannot be read, return the supplied default.
    """

    try:
        if not file_path.exists():
            return default

        with file_path.open(
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    except (
        OSError,
        ValueError,
        TypeError,
        json.JSONDecodeError
    ):
        return default


def _write_json(
    file_path: Path,
    data: Any
) -> bool:
    """
    Safely write JSON data.

    Returns:
        True  -> successful
        False -> failed
    """

    try:
        file_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        temp_file = file_path.with_suffix(
            file_path.suffix + ".tmp"
        )

        with temp_file.open(
            "w",
            encoding="utf-8"
        ) as file:
            json.dump(
                data,
                file,
                indent=2,
                ensure_ascii=False
            )

        temp_file.replace(file_path)

        return True

    except OSError:
        return False


def _normalize_player_name(
    player_name: str
) -> str:
    """
    Normalize a Minecraft player name.
    """

    if player_name is None:
        return ""

    return str(player_name).strip()


def _player_matches(
    player: dict[str, Any],
    player_name: str
) -> bool:
    """
    Case-insensitive player-name comparison.
    """

    target = _normalize_player_name(
        player_name
    ).lower()

    possible_names = (
        player.get("name"),
        player.get("username"),
        player.get("player_name"),
    )

    return any(
        str(name).strip().lower() == target
        for name in possible_names
        if name is not None
    )


# ============================================================
# SERVER STATUS
# ============================================================

def get_server_status() -> dict[str, Any]:
    """
    Return Nexora server status.

    Expected response shape:

    {
        "online": true,
        "host": "...",
        "port": 25565,
        "players": {
            "online": 0,
            "max": 0,
            "list": []
        },
        "version": "...",
        "motd": "...",
        "timestamp": ...
    }

    A real Minecraft bridge should update server.json.
    """

    stored = _read_json(
        SERVER_DATA_FILE,
        {}
    )

    if not isinstance(stored, dict):
        stored = {}

    players = stored.get(
        "players",
        {}
    )

    if not isinstance(players, dict):
        players = {}

    player_list = players.get(
        "list",
        []
    )

    if not isinstance(player_list, list):
        player_list = []

    online = stored.get(
        "online",
        False
    )

    return {
        "success": True,

        "online": bool(online),

        "host": stored.get(
            "host",
            NEXORA_SERVER_IP
        ),

        "port": stored.get(
            "port",
            NEXORA_SERVER_PORT
        ),

        "players": {
            "online": stored.get(
                "player_count",
                players.get(
                    "online",
                    len(player_list)
                )
            ),

            "max": players.get(
                "max",
                stored.get(
                    "max_players",
                    0
                )
            ),

            "list": player_list
        },

        "version": stored.get(
            "version",
            "Unknown"
        ),

        "motd": stored.get(
            "motd",
            "Nexora SMP"
        ),

        "timestamp": stored.get(
            "timestamp",
            int(time.time())
        )
    }


# ============================================================
# ONLINE PLAYERS
# ============================================================

def get_online_players() -> list[dict[str, Any]]:
    """
    Return currently online players.

    Expected format:

    [
        {
            "name": "DKSGAMERZ120",
            "uuid": "...",
            "rank": "Owner",
            "online": true
        }
    ]
    """

    server = get_server_status()

    players = server.get(
        "players",
        {}
    )

    if not isinstance(players, dict):
        return []

    player_list = players.get(
        "list",
        []
    )

    if not isinstance(player_list, list):
        return []

    result = []

    for player in player_list:

        # Simple string format:
        #
        # ["Player1", "Player2"]

        if isinstance(player, str):

            result.append({
                "name": player,
                "uuid": None,
                "rank": "Player",
                "online": True
            })

            continue

        # Full object format:
        #
        # [
        #   {
        #       "name": "...",
        #       "uuid": "...",
        #       "rank": "..."
        #   }
        # ]

        if isinstance(player, dict):

            name = (
                player.get("name")
                or player.get("username")
                or player.get("player_name")
            )

            if not name:
                continue

            result.append({
                "name": str(name),
                "uuid": player.get("uuid"),
                "rank": player.get(
                    "rank",
                    player.get(
                        "group",
                        "Player"
                    )
                ),
                "online": True
            })

    return result


# ============================================================
# LEADERBOARD
# ============================================================

def get_leaderboard() -> list[dict[str, Any]]:
    """
    Return leaderboard data.

    Expected format:

    [
        {
            "position": 1,
            "name": "DKSGAMERZ120",
            "rank": "Owner",
            "hearts": 20,
            "kills": 0,
            "deaths": 0,
            "balance": 0
        }
    ]
    """

    data = _read_json(
        LEADERBOARD_DATA_FILE,
        []
    )

    if isinstance(data, dict):

        data = (
            data.get("leaderboard")
            or data.get("players")
            or data.get("data")
            or []
        )

    if not isinstance(data, list):
        return []

    result = []

    for index, player in enumerate(
        data,
        start=1
    ):

        if not isinstance(player, dict):
            continue

        name = (
            player.get("name")
            or player.get("username")
            or player.get("player_name")
        )

        if not name:
            continue

        result.append({
            "position": player.get(
                "position",
                player.get(
                    "rank_position",
                    index
                )
            ),

            "name": str(name),

            "rank": player.get(
                "rank",
                player.get(
                    "server_rank",
                    player.get(
                        "group",
                        "Player"
                    )
                )
            ),

            "hearts": player.get(
                "hearts",
                player.get(
                    "health",
                    player.get(
                        "life",
                        0
                    )
                )
            ),

            "kills": player.get(
                "kills",
                player.get(
                    "kill",
                    0
                )
            ),

            "deaths": player.get(
                "deaths",
                player.get(
                    "death",
                    0
                )
            ),

            "balance": player.get(
                "balance",
                player.get(
                    "money",
                    0
                )
            )
        })

    return result


# ============================================================
# PLAYER DATA
# ============================================================

def _load_players_database() -> list[dict[str, Any]]:
    """
    Load player data from players.json.
    """

    data = _read_json(
        PLAYERS_DATA_FILE,
        []
    )

    if isinstance(data, dict):

        data = (
            data.get("players")
            or data.get("data")
            or []
        )

    if not isinstance(data, list):
        return []

    return [
        player
        for player in data
        if isinstance(player, dict)
    ]


def get_player_data(
    player_name: str
) -> dict[str, Any] | None:
    """
    Return complete player information.

    Returns None when the player is not found.
    """

    player_name = _normalize_player_name(
        player_name
    )

    if not player_name:
        return None

    players = _load_players_database()

    for player in players:

        if _player_matches(
            player,
            player_name
        ):

            return {
                "name": (
                    player.get("name")
                    or player.get("username")
                    or player.get("player_name")
                    or player_name
                ),

                "uuid": player.get(
                    "uuid"
                ),

                "rank": player.get(
                    "rank",
                    player.get(
                        "server_rank",
                        player.get(
                            "group",
                            "Player"
                        )
                    )
                ),

                "hearts": player.get(
                    "hearts",
                    player.get(
                        "health",
                        0
                    )
                ),

                "maxHearts": player.get(
                    "maxHearts",
                    player.get(
                        "max_hearts",
                        20
                    )
                ),

                "kills": player.get(
                    "kills",
                    0
                ),

                "deaths": player.get(
                    "deaths",
                    0
                ),

                "balance": player.get(
                    "balance",
                    player.get(
                        "money",
                        0
                    )
                ),

                "playtime": player.get(
                    "playtime",
                    0
                ),

                "online": bool(
                    player.get(
                        "online",
                        False
                    )
                ),

                "firstJoin": player.get(
                    "firstJoin",
                    player.get(
                        "first_join",
                        None
                    )
                ),

                "lastSeen": player.get(
                    "lastSeen",
                    player.get(
                        "last_seen",
                        None
                    )
                ),

                "inventory": player.get(
                    "inventory",
                    []
                ),

                "activity": player.get(
                    "activity",
                    []
                )
            }

    return None


# ============================================================
# PLAYER STATS
# ============================================================

def get_player_stats(
    player_name: str
) -> dict[str, Any] | None:
    """
    Return player statistics.
    """

    player = get_player_data(
        player_name
    )

    if player is None:
        return None

    return {
        "name": player.get(
            "name"
        ),

        "hearts": player.get(
            "hearts",
            0
        ),

        "maxHearts": player.get(
            "maxHearts",
            20
        ),

        "kills": player.get(
            "kills",
            0
        ),

        "deaths": player.get(
            "deaths",
            0
        ),

        "balance": player.get(
            "balance",
            0
        ),

        "playtime": player.get(
            "playtime",
            0
        ),

        "online": player.get(
            "online",
            False
        ),

        "firstJoin": player.get(
            "firstJoin"
        ),

        "lastSeen": player.get(
            "lastSeen"
        )
    }


# ============================================================
# PLAYER INVENTORY
# ============================================================

def get_player_inventory(
    player_name: str
) -> list[Any] | None:
    """
    Return player inventory data.
    """

    player = get_player_data(
        player_name
    )

    if player is None:
        return None

    inventory = player.get(
        "inventory",
        []
    )

    if not isinstance(
        inventory,
        list
    ):
        return []

    return inventory


# ============================================================
# OPTIONAL DATA WRITERS
# ============================================================

def save_server_status(
    data: dict[str, Any]
) -> bool:
    """
    Save server status.

    Intended for the future Minecraft bridge.
    """

    if not isinstance(data, dict):
        return False

    data = dict(data)

    data.setdefault(
        "host",
        NEXORA_SERVER_IP
    )

    data.setdefault(
        "port",
        NEXORA_SERVER_PORT
    )

    data["timestamp"] = int(
        time.time()
    )

    return _write_json(
        SERVER_DATA_FILE,
        data
    )


def save_players(
    players: list[dict[str, Any]]
) -> bool:
    """
    Save player data.

    Intended for the future Minecraft bridge.
    """

    if not isinstance(
        players,
        list
    ):
        return False

    return _write_json(
        PLAYERS_DATA_FILE,
        {
            "players": players
        }
    )


def save_leaderboard(
    leaderboard: list[dict[str, Any]]
) -> bool:
    """
    Save leaderboard data.

    Intended for the future Minecraft bridge.
    """

    if not isinstance(
        leaderboard,
        list
    ):
        return False

    return _write_json(
        LEADERBOARD_DATA_FILE,
        {
            "leaderboard": leaderboard
        }
    )


# ============================================================
# MODULE EXPORTS
# ============================================================

__all__ = [
    "get_server_status",
    "get_online_players",
    "get_leaderboard",
    "get_player_data",
    "get_player_stats",
    "get_player_inventory",
    "save_server_status",
    "save_players",
    "save_leaderboard",
]