"""
=========================================================
NEXORA SMP — BACKEND APP
Main Flask application
=========================================================

Architecture:

Minecraft Server
       ↓
Nexora data / API bridge
       ↓
Python Backend
       ↓
Website

Main API endpoints:

GET  /api/server
GET  /api/players
GET  /api/leaderboard
GET  /api/player/<player>
GET  /api/player/<player>/stats
GET  /api/player/<player>/inventory

POST /api/auth/login
=========================================================
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS


# =========================================================
# OPTIONAL BACKEND MODULES
# =========================================================

try:
    from server_api import (
        get_server_status,
        get_online_players,
        get_leaderboard,
        get_player_data,
        get_player_stats,
        get_player_inventory,
    )
except ImportError:
    get_server_status = None
    get_online_players = None
    get_leaderboard = None
    get_player_data = None
    get_player_stats = None
    get_player_inventory = None


try:
    from auth import authenticate_player
except ImportError:
    authenticate_player = None


try:
    from database import (
        initialize_database,
        get_database_status,
    )
except ImportError:
    initialize_database = None
    get_database_status = None


# =========================================================
# FLASK APP
# =========================================================

app = Flask(
    __name__,
    static_folder=None
)


# =========================================================
# CONFIGURATION
# =========================================================

APP_NAME = "Nexora SMP Backend"

HOST = os.getenv(
    "NEXORA_HOST",
    "127.0.0.1"
)

PORT = int(
    os.getenv(
        "NEXORA_PORT",
        "5000"
    )
)

DEBUG = os.getenv(
    "NEXORA_DEBUG",
    "false"
).lower() in (
    "1",
    "true",
    "yes"
)


# =========================================================
# CORS
# =========================================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


# =========================================================
# SERVER START TIME
# =========================================================

SERVER_START_TIME = time.time()


# =========================================================
# COMMON RESPONSE HELPERS
# =========================================================

def success_response(
    data: Any = None,
    message: str | None = None,
    status: int = 200
):
    """
    Standard successful API response.
    """

    response = {
        "success": True
    }

    if data is not None:
        if isinstance(data, dict):
            response.update(data)
        else:
            response["data"] = data

    if message:
        response["message"] = message

    return jsonify(response), status


def error_response(
    message: str,
    status: int = 400,
    error: str | None = None
):
    """
    Standard API error response.
    """

    response = {
        "success": False,
        "message": message
    }

    if error:
        response["error"] = error

    return jsonify(response), status


# =========================================================
# INPUT HELPERS
# =========================================================

def clean_player_name(value: Any) -> str:
    """
    Clean a Minecraft player name.

    Minecraft Java names are normally limited to
    3–16 characters and use letters, numbers and underscore.

    Bedrock/Floodgate names can differ, so this function
    intentionally does not reject valid server-side names.
    """

    if value is None:
        return ""

    return str(value).strip()


def valid_player_name(player: str) -> bool:
    """
    Basic player-name validation.

    This prevents obviously malformed API requests.
    """

    if not player:
        return False

    if len(player) > 32:
        return False

    allowed = (
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789"
        "_"
        "."
        "-"
    )

    return all(
        character in allowed
        for character in player
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
def index():
    """
    Backend root endpoint.
    """

    return success_response(
        {
            "name": APP_NAME,
            "status": "online",
            "api": "/api",
        }
    )


@app.get("/api")
def api_info():
    """
    API information endpoint.
    """

    return success_response(
        {
            "name": APP_NAME,
            "version": "1.0.0",
            "status": "online",
            "endpoints": {
                "server": "/api/server",
                "players": "/api/players",
                "leaderboard": "/api/leaderboard",
                "player": "/api/player/<player>",
                "stats": "/api/player/<player>/stats",
                "inventory": "/api/player/<player>/inventory",
                "login": "/api/auth/login",
            }
        }
    )


@app.get("/api/health")
def health():
    """
    Simple backend health check.
    """

    uptime = int(
        time.time() - SERVER_START_TIME
    )

    return success_response(
        {
            "status": "healthy",
            "uptime": uptime,
            "backend": APP_NAME
        }
    )


# =========================================================
# SERVER STATUS
# =========================================================

@app.get("/api/server")
def api_server():
    """
    Return Nexora server status.

    Expected frontend fields:

    online
    players.online
    players.list
    player_count
    latency
    """

    try:

        if get_server_status is not None:

            result = get_server_status()

            if result is None:
                result = {}

            if isinstance(result, dict):
                return jsonify({
                    "success": True,
                    **result
                })

            return success_response(
                result
            )

        # -------------------------------------------------
        # Safe fallback while server_api.py is not ready
        # -------------------------------------------------

        return success_response(
            {
                "online": False,

                "players": {
                    "online": 0,
                    "list": []
                },

                "player_count": 0,

                "latency": None,

                "server": {
                    "name": "Nexora SMP",
                    "address": "play.nexorasmp.2bd.net",
                    "edition": "Java + Bedrock",
                    "mode": "Lifesteal"
                },

                "message":
                    "Minecraft server bridge is not connected yet."
            }
        )

    except Exception as exc:

        app.logger.exception(
            "Server status error"
        )

        return error_response(
            "Unable to read Nexora server status.",
            503,
            str(exc)
        )


# =========================================================
# ONLINE PLAYERS
# =========================================================

@app.get("/api/players")
def api_players():
    """
    Return currently online players.
    """

    try:

        if get_online_players is not None:

            result = get_online_players()

            if result is None:
                result = []

            if isinstance(result, dict):

                if "players" not in result:
                    result = {
                        "players": result
                    }

                return success_response(
                    result
                )

            return success_response(
                {
                    "players": result
                }
            )

        return success_response(
            {
                "players": []
            }
        )

    except Exception as exc:

        app.logger.exception(
            "Online player error"
        )

        return error_response(
            "Unable to read online players.",
            503,
            str(exc)
        )


# =========================================================
# LEADERBOARD
# =========================================================

@app.get("/api/leaderboard")
def api_leaderboard():
    """
    Return Nexora leaderboard.
    """

    try:

        if get_leaderboard is not None:

            result = get_leaderboard()

            if result is None:
                result = []

            if isinstance(result, dict):

                if (
                    "leaderboard" not in result
                    and "players" not in result
                    and "data" not in result
                ):
                    result = {
                        "leaderboard": result
                    }

                return success_response(
                    result
                )

            return success_response(
                {
                    "leaderboard": result
                }
            )

        return success_response(
            {
                "leaderboard": []
            }
        )

    except Exception as exc:

        app.logger.exception(
            "Leaderboard error"
        )

        return error_response(
            "Unable to load leaderboard.",
            503,
            str(exc)
        )


# =========================================================
# PLAYER PROFILE
# =========================================================

@app.get("/api/player/<player>")
def api_player(player: str):
    """
    Return complete player profile.
    """

    player = clean_player_name(
        player
    )

    if not valid_player_name(player):
        return error_response(
            "Invalid Minecraft player name.",
            400
        )

    try:

        if get_player_data is not None:

            result = get_player_data(
                player
            )

            if result is None:
                return error_response(
                    "Player not found.",
                    404
                )

            if isinstance(result, dict):

                return success_response(
                    {
                        "player": result
                    }
                )

            return success_response(
                {
                    "player": result
                }
            )

        # -------------------------------------------------
        # Backend bridge not connected
        # -------------------------------------------------

        return error_response(
            "Player data bridge is not connected yet.",
            503
        )

    except Exception as exc:

        app.logger.exception(
            "Player profile error"
        )

        return error_response(
            "Unable to load player profile.",
            500,
            str(exc)
        )


# =========================================================
# PLAYER STATS
# =========================================================

@app.get("/api/player/<player>/stats")
def api_player_stats(player: str):
    """
    Return player statistics.
    """

    player = clean_player_name(
        player
    )

    if not valid_player_name(player):
        return error_response(
            "Invalid Minecraft player name.",
            400
        )

    try:

        if get_player_stats is not None:

            result = get_player_stats(
                player
            )

            if result is None:
                return error_response(
                    "Player statistics not found.",
                    404
                )

            return success_response(
                {
                    "stats": result
                }
            )

        return error_response(
            "Player statistics bridge is not connected yet.",
            503
        )

    except Exception as exc:

        app.logger.exception(
            "Player stats error"
        )

        return error_response(
            "Unable to load player statistics.",
            500,
            str(exc)
        )


# =========================================================
# PLAYER INVENTORY
# =========================================================

@app.get("/api/player/<player>/inventory")
def api_player_inventory(player: str):
    """
    Return player inventory.
    """

    player = clean_player_name(
        player
    )

    if not valid_player_name(player):
        return error_response(
            "Invalid Minecraft player name.",
            400
        )

    try:

        if get_player_inventory is not None:

            result = get_player_inventory(
                player
            )

            if result is None:
                return error_response(
                    "Player inventory not found.",
                    404
                )

            return success_response(
                {
                    "inventory": result
                }
            )

        return error_response(
            "Player inventory bridge is not connected yet.",
            503
        )

    except Exception as exc:

        app.logger.exception(
            "Player inventory error"
        )

        return error_response(
            "Unable to load player inventory.",
            503,
            str(exc)
        )


# =========================================================
# WEBSITE LOGIN
# =========================================================

@app.post("/api/auth/login")
def api_login():
    """
    Authenticate a Nexora player.

    IMPORTANT:

    This endpoint does NOT store passwords.

    The submitted password is passed to the authentication
    backend, which must verify it against the existing
    Nexora/AuthMe password hash.

    Never return the password or password hash to the client.
    """

    if not request.is_json:
        return error_response(
            "Request must use JSON.",
            415
        )

    payload = request.get_json(
        silent=True
    )

    if not isinstance(payload, dict):
        return error_response(
            "Invalid login request.",
            400
        )

    player = clean_player_name(
        payload.get(
            "player_name",
            ""
        )
    )

    password = payload.get(
        "password",
        ""
    )

    if not player:
        return error_response(
            "Minecraft player name is required.",
            400
        )

    if not valid_player_name(player):
        return error_response(
            "Invalid Minecraft player name.",
            400
        )

    if not isinstance(password, str) or not password:
        return error_response(
            "Password is required.",
            400
        )

    # -----------------------------------------------------
    # Authentication backend
    # -----------------------------------------------------

    if authenticate_player is None:

        return error_response(
            "Authentication backend is not connected yet.",
            503
        )

    try:

        authenticated = authenticate_player(
            player,
            password
        )

        if not authenticated:

            return error_response(
                "Invalid Minecraft name or password.",
                401
            )

        # -------------------------------------------------
        # IMPORTANT:
        # Do not return password/hash/token here.
        # -------------------------------------------------

        return success_response(
            {
                "player_name": player
            },
            "Login successful."
        )

    except Exception as exc:

        app.logger.exception(
            "Authentication error"
        )

        return error_response(
            "Authentication service error.",
            500,
            str(exc)
        )


# =========================================================
# DATABASE STATUS
# =========================================================

@app.get("/api/database")
def api_database():
    """
    Development/admin diagnostic endpoint.

    Does not expose database credentials or passwords.
    """

    try:

        if get_database_status is not None:

            result = get_database_status()

            return success_response(
                {
                    "database": result
                }
            )

        return success_response(
            {
                "database": {
                    "connected": False,
                    "message":
                        "Database module not connected."
                }
            }
        )

    except Exception as exc:

        app.logger.exception(
            "Database status error"
        )

        return error_response(
            "Unable to check database.",
            503,
            str(exc)
        )


# =========================================================
# 404 HANDLER
# =========================================================

@app.errorhandler(404)
def not_found(error):
    """
    JSON 404 for unknown API routes.
    """

    if request.path.startswith("/api/"):

        return error_response(
            "API endpoint not found.",
            404
        )

    return error_response(
        "Endpoint not found.",
        404
    )


# =========================================================
# 405 HANDLER
# =========================================================

@app.errorhandler(405)
def method_not_allowed(error):

    return error_response(
        "HTTP method not allowed.",
        405
    )


# =========================================================
# 500 HANDLER
# =========================================================

@app.errorhandler(500)
def internal_error(error):

    app.logger.exception(
        "Internal server error"
    )

    return error_response(
        "Internal Nexora backend error.",
        500
    )


# =========================================================
# STARTUP
# =========================================================

def initialize_app():
    """
    Initialize backend services.
    """

    if initialize_database is not None:

        try:
            initialize_database()

            app.logger.info(
                "Database initialized."
            )

        except Exception:

            app.logger.exception(
                "Database initialization failed."
            )


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    initialize_app()

    print("=" * 60)
    print("NEXORA SMP BACKEND")
    print("=" * 60)
    print(
        f"Backend: http://{HOST}:{PORT}"
    )
    print(
        f"API:     http://{HOST}:{PORT}/api"
    )
    print(
        f"Health:  http://{HOST}:{PORT}/api/health"
    )
    print("=" * 60)

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG
    )