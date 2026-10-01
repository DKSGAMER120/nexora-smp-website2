# backend/database.py

"""
NEXORA SMP - Database Layer
===========================

SQLite database used by the Nexora website backend.

This file handles:
    - Database initialization
    - Player records
    - Player statistics
    - Inventory data
    - Activity data
    - Login/session-related database helpers

IMPORTANT:
    Minecraft/AuthMe passwords or password hashes should NOT be
    copied into this database in plaintext.

Authentication remains handled by auth.py.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = Path(
    os.getenv(
        "NEXORA_DATABASE",
        str(BASE_DIR / "nexora.db")
    )
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection() -> sqlite3.Connection:
    """
    Create a new SQLite connection.

    A new connection is used for each operation so the backend
    remains safe when multiple requests are being processed.
    """

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=10
    )

    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def initialize_database() -> bool:
    """
    Create all required Nexora tables if they do not exist.
    """

    try:

        DATABASE_PATH.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        connection = get_connection()

        cursor = connection.cursor()

        # ----------------------------------------------------
        # PLAYERS
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                uuid TEXT UNIQUE,

                name TEXT NOT NULL UNIQUE,

                rank TEXT DEFAULT 'Player',

                hearts REAL DEFAULT 20,

                max_hearts REAL DEFAULT 20,

                kills INTEGER DEFAULT 0,

                deaths INTEGER DEFAULT 0,

                balance REAL DEFAULT 0,

                playtime INTEGER DEFAULT 0,

                online INTEGER DEFAULT 0,

                first_join TEXT,

                last_seen TEXT,

                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # ----------------------------------------------------
        # INVENTORY
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS inventories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                player_uuid TEXT,

                player_name TEXT NOT NULL,

                inventory_json TEXT NOT NULL DEFAULT '[]',

                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(player_name)
            )
            """
        )

        # ----------------------------------------------------
        # ACTIVITY
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                player_uuid TEXT,

                player_name TEXT NOT NULL,

                activity_type TEXT NOT NULL,

                message TEXT NOT NULL,

                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # ----------------------------------------------------
        # SERVER SETTINGS
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS server_settings (
                key TEXT PRIMARY KEY,

                value TEXT,

                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # ----------------------------------------------------
        # INDEXES
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_players_name
            ON players(name)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_players_kills
            ON players(kills)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_players_hearts
            ON players(hearts)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_activities_player
            ON activities(player_name)
            """
        )

        connection.commit()

        connection.close()

        return True

    except sqlite3.Error:

        return False


# ============================================================
# PLAYER HELPERS
# ============================================================

def _row_to_player(
    row: sqlite3.Row | None
) -> dict[str, Any] | None:

    if row is None:
        return None

    return {
        "id": row["id"],
        "uuid": row["uuid"],
        "name": row["name"],
        "rank": row["rank"],
        "hearts": row["hearts"],
        "maxHearts": row["max_hearts"],
        "kills": row["kills"],
        "deaths": row["deaths"],
        "balance": row["balance"],
        "playtime": row["playtime"],
        "online": bool(row["online"]),
        "firstJoin": row["first_join"],
        "lastSeen": row["last_seen"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def get_player(
    player_name: str
) -> dict[str, Any] | None:

    player_name = str(
        player_name or ""
    ).strip()

    if not player_name:
        return None

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM players
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
            """,
            (player_name,)
        )

        row = cursor.fetchone()

        connection.close()

        return _row_to_player(row)

    except sqlite3.Error:

        return None


def get_all_players() -> list[dict[str, Any]]:

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM players
            ORDER BY name COLLATE NOCASE ASC
            """
        )

        rows = cursor.fetchall()

        connection.close()

        return [
            _row_to_player(row)
            for row in rows
        ]

    except sqlite3.Error:

        return []


def save_player(
    player: dict[str, Any]
) -> bool:

    if not isinstance(player, dict):
        return False

    name = str(
        player.get("name")
        or player.get("username")
        or player.get("player_name")
        or ""
    ).strip()

    if not name:
        return False

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO players (
                uuid,
                name,
                rank,
                hearts,
                max_hearts,
                kills,
                deaths,
                balance,
                playtime,
                online,
                first_join,
                last_seen
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(name)
            DO UPDATE SET
                uuid = excluded.uuid,
                rank = excluded.rank,
                hearts = excluded.hearts,
                max_hearts = excluded.max_hearts,
                kills = excluded.kills,
                deaths = excluded.deaths,
                balance = excluded.balance,
                playtime = excluded.playtime,
                online = excluded.online,
                first_join = excluded.first_join,
                last_seen = excluded.last_seen,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                player.get("uuid"),

                name,

                player.get(
                    "rank",
                    player.get(
                        "group",
                        "Player"
                    )
                ),

                player.get(
                    "hearts",
                    player.get(
                        "health",
                        20
                    )
                ),

                player.get(
                    "maxHearts",
                    player.get(
                        "max_hearts",
                        20
                    )
                ),

                player.get(
                    "kills",
                    0
                ),

                player.get(
                    "deaths",
                    0
                ),

                player.get(
                    "balance",
                    player.get(
                        "money",
                        0
                    )
                ),

                player.get(
                    "playtime",
                    0
                ),

                1 if player.get(
                    "online",
                    False
                ) else 0,

                player.get(
                    "firstJoin",
                    player.get(
                        "first_join"
                    )
                ),

                player.get(
                    "lastSeen",
                    player.get(
                        "last_seen"
                    )
                )
            )
        )

        connection.commit()

        connection.close()

        return True

    except sqlite3.Error:

        return False


# ============================================================
# PLAYER STATISTICS
# ============================================================

def get_player_stats(
    player_name: str
) -> dict[str, Any] | None:

    player = get_player(
        player_name
    )

    if player is None:
        return None

    return {
        "name": player["name"],
        "hearts": player["hearts"],
        "maxHearts": player["maxHearts"],
        "kills": player["kills"],
        "deaths": player["deaths"],
        "balance": player["balance"],
        "playtime": player["playtime"],
        "online": player["online"],
        "firstJoin": player["firstJoin"],
        "lastSeen": player["lastSeen"],
    }


# ============================================================
# INVENTORY
# ============================================================

def get_inventory(
    player_name: str
) -> list[Any] | None:

    player_name = str(
        player_name or ""
    ).strip()

    if not player_name:
        return None

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT inventory_json
            FROM inventories
            WHERE LOWER(player_name) = LOWER(?)
            LIMIT 1
            """,
            (player_name,)
        )

        row = cursor.fetchone()

        connection.close()

        if row is None:
            return []

        try:

            data = json.loads(
                row["inventory_json"]
            )

            return (
                data
                if isinstance(data, list)
                else []
            )

        except (
            ValueError,
            TypeError,
            json.JSONDecodeError
        ):

            return []

    except sqlite3.Error:

        return None


def save_inventory(
    player_name: str,
    inventory: list[Any],
    player_uuid: str | None = None
) -> bool:

    if not player_name:
        return False

    if not isinstance(
        inventory,
        list
    ):
        return False

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO inventories (
                player_uuid,
                player_name,
                inventory_json
            )

            VALUES (?, ?, ?)

            ON CONFLICT(player_name)
            DO UPDATE SET
                player_uuid = excluded.player_uuid,
                inventory_json = excluded.inventory_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                player_uuid,
                str(player_name).strip(),
                json.dumps(
                    inventory,
                    ensure_ascii=False
                )
            )
        )

        connection.commit()

        connection.close()

        return True

    except sqlite3.Error:

        return False


# ============================================================
# ACTIVITY
# ============================================================

def get_player_activity(
    player_name: str,
    limit: int = 20
) -> list[dict[str, Any]]:

    player_name = str(
        player_name or ""
    ).strip()

    if not player_name:
        return []

    try:
        limit = max(
            1,
            min(
                int(limit),
                100
            )
        )
    except (
        ValueError,
        TypeError
    ):
        limit = 20

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                activity_type,
                message,
                created_at

            FROM activities

            WHERE LOWER(player_name) = LOWER(?)

            ORDER BY id DESC

            LIMIT ?
            """,
            (
                player_name,
                limit
            )
        )

        rows = cursor.fetchall()

        connection.close()

        return [
            {
                "type": row["activity_type"],
                "message": row["message"],
                "createdAt": row["created_at"]
            }
            for row in rows
        ]

    except sqlite3.Error:

        return []


def add_player_activity(
    player_name: str,
    activity_type: str,
    message: str,
    player_uuid: str | None = None
) -> bool:

    if not player_name:
        return False

    if not activity_type:
        return False

    if not message:
        return False

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO activities (
                player_uuid,
                player_name,
                activity_type,
                message
            )

            VALUES (?, ?, ?, ?)
            """,
            (
                player_uuid,
                str(player_name).strip(),
                str(activity_type).strip(),
                str(message).strip()
            )
        )

        connection.commit()

        connection.close()

        return True

    except sqlite3.Error:

        return False


# ============================================================
# LEADERBOARD
# ============================================================

def get_leaderboard(
    limit: int = 100
) -> list[dict[str, Any]]:

    try:
        limit = max(
            1,
            min(
                int(limit),
                500
            )
        )
    except (
        ValueError,
        TypeError
    ):
        limit = 100

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                name,
                rank,
                hearts,
                kills,
                deaths,
                balance

            FROM players

            ORDER BY
                kills DESC,
                hearts DESC,
                balance DESC

            LIMIT ?
            """,
            (limit,)
        )

        rows = cursor.fetchall()

        connection.close()

        leaderboard = []

        for position, row in enumerate(
            rows,
            start=1
        ):

            leaderboard.append(
                {
                    "position": position,
                    "name": row["name"],
                    "rank": row["rank"],
                    "hearts": row["hearts"],
                    "kills": row["kills"],
                    "deaths": row["deaths"],
                    "balance": row["balance"]
                }
            )

        return leaderboard

    except sqlite3.Error:

        return []


# ============================================================
# SERVER SETTINGS
# ============================================================

def get_setting(
    key: str,
    default: Any = None
) -> Any:

    if not key:
        return default

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT value
            FROM server_settings
            WHERE key = ?
            LIMIT 1
            """,
            (key,)
        )

        row = cursor.fetchone()

        connection.close()

        if row is None:
            return default

        try:
            return json.loads(
                row["value"]
            )
        except (
            ValueError,
            TypeError,
            json.JSONDecodeError
        ):
            return row["value"]

    except sqlite3.Error:

        return default


def set_setting(
    key: str,
    value: Any
) -> bool:

    if not key:
        return False

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        serialized = json.dumps(
            value,
            ensure_ascii=False
        )

        cursor.execute(
            """
            INSERT INTO server_settings (
                key,
                value
            )

            VALUES (?, ?)

            ON CONFLICT(key)
            DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                key,
                serialized
            )
        )

        connection.commit()

        connection.close()

        return True

    except sqlite3.Error:

        return False


# ============================================================
# DATABASE INFORMATION
# ============================================================

def get_database_info() -> dict[str, Any]:

    initialize_database()

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM players"
        )

        player_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM activities"
        )

        activity_count = cursor.fetchone()[0]

        connection.close()

        return {
            "database": "SQLite",
            "path": str(DATABASE_PATH),
            "players": player_count,
            "activities": activity_count,
            "status": "ready"
        }

    except sqlite3.Error as error:

        return {
            "database": "SQLite",
            "path": str(DATABASE_PATH),
            "players": 0,
            "activities": 0,
            "status": "error",
            "error": str(error)
        }


# ============================================================
# INITIALIZE ON IMPORT
# ============================================================

initialize_database()


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "get_connection",
    "initialize_database",

    "get_player",
    "get_all_players",
    "save_player",

    "get_player_stats",

    "get_inventory",
    "save_inventory",

    "get_player_activity",
    "add_player_activity",

    "get_leaderboard",

    "get_setting",
    "set_setting",

    "get_database_info",
]