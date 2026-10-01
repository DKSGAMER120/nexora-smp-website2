"""
NEXORA SMP
AuthMe Authentication Adapter

Current AuthMe configuration:
    Database: SQLite
    Table: authme
    Username column: username
    Password column: password
    Hash algorithm: SHA256

IMPORTANT:
- This module NEVER stores plaintext passwords.
- The AuthMe SQLite database is only read for authentication.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Optional


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# Recommended:
# Set NEXORA_AUTHME_DB to the exact location of AuthMe's authme.db
#
# Example Windows:
# NEXORA_AUTHME_DB=C:\NexoraServer\plugins\AuthMe\authme.db
#
# Example Linux:
# NEXORA_AUTHME_DB=/home/minecraft/plugins/AuthMe/authme.db
#
# Default assumes:
# backend/
# plugins/
#     AuthMe/
#         authme.db
#
DEFAULT_AUTHME_DB = BASE_DIR.parent / "plugins" / "AuthMe" / "authme.db"

AUTHME_DB = Path(
    os.getenv(
        "NEXORA_AUTHME_DB",
        str(DEFAULT_AUTHME_DB)
    )
).expanduser()


# AuthMe configuration
AUTHME_TABLE = "authme"
USERNAME_COLUMN = "username"
PASSWORD_COLUMN = "password"

# Current AuthMe config.yml:
# security:
#     passwordHash: SHA256
HASH_ALGORITHM = "SHA256"


# Minecraft/AuthMe username rules
USERNAME_PATTERN = re.compile(
    r"^[A-Za-z0-9_.-]{1,16}$"
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_authme_database_path() -> Path:
    """
    Return the configured AuthMe SQLite database path.
    """
    return AUTHME_DB


def authme_database_exists() -> bool:
    """
    Check whether the AuthMe SQLite database exists.
    """
    return AUTHME_DB.is_file()


def _connect() -> sqlite3.Connection:
    """
    Open AuthMe SQLite database in read-only mode.

    Read-only mode is intentional:
    auth.py must not modify AuthMe accounts.
    """

    if not AUTHME_DB.is_file():
        raise FileNotFoundError(
            f"AuthMe database not found: {AUTHME_DB}"
        )

    # SQLite URI for read-only access.
    database_uri = (
        f"file:{AUTHME_DB.resolve().as_posix()}"
        f"?mode=ro"
    )

    connection = sqlite3.connect(
        database_uri,
        uri=True,
        timeout=5,
    )

    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# VALIDATION
# ============================================================

def validate_player_name(player_name: str) -> bool:
    """
    Validate a Minecraft player name.

    This matches the practical AuthMe username restrictions:
        A-Z
        a-z
        0-9
        _
        .
        -

    Maximum length: 16
    """

    if not isinstance(player_name, str):
        return False

    player_name = player_name.strip()

    if not player_name:
        return False

    if len(player_name) > 16:
        return False

    return bool(USERNAME_PATTERN.fullmatch(player_name))


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password_sha256(password: str) -> str:
    """
    Hash a password using SHA-256.

    This matches the current AuthMe configuration:

        passwordHash: SHA256

    Returns:
        lowercase hexadecimal SHA-256 hash
    """

    if not isinstance(password, str):
        raise TypeError("Password must be a string")

    password_bytes = password.encode("utf-8")

    return hashlib.sha256(password_bytes).hexdigest()


def verify_sha256_password(
    password: str,
    stored_hash: str,
) -> bool:
    """
    Compare a supplied password against an AuthMe SHA256 hash.

    hmac.compare_digest() is used to avoid a simple
    timing-comparison weakness.
    """

    if not isinstance(password, str):
        return False

    if not isinstance(stored_hash, str):
        return False

    stored_hash = stored_hash.strip()

    if not stored_hash:
        return False

    calculated_hash = hash_password_sha256(password)

    return hmac.compare_digest(
        calculated_hash.lower(),
        stored_hash.lower(),
    )


# ============================================================
# AUTHME ACCOUNT LOOKUP
# ============================================================

def get_authme_account(
    player_name: str,
) -> Optional[dict[str, Any]]:
    """
    Retrieve an AuthMe account.

    Only the username and password hash are read.

    The plaintext password is NEVER stored or returned.
    """

    if not validate_player_name(player_name):
        return None

    connection: Optional[sqlite3.Connection] = None

    try:
        connection = _connect()

        query = f"""
            SELECT
                "{USERNAME_COLUMN}" AS username,
                "{PASSWORD_COLUMN}" AS password_hash
            FROM "{AUTHME_TABLE}"
            WHERE "{USERNAME_COLUMN}" = ?
            LIMIT 1
        """

        cursor = connection.execute(
            query,
            (player_name,),
        )

        row = cursor.fetchone()

        if row is None:
            return None

        return {
            "username": row["username"],
            "password_hash": row["password_hash"],
        }

    except sqlite3.Error:
        return None

    finally:
        if connection is not None:
            connection.close()


# ============================================================
# ACCOUNT EXISTENCE
# ============================================================

def player_registered(player_name: str) -> bool:
    """
    Check whether the Minecraft player is registered
    in AuthMe.
    """

    account = get_authme_account(player_name)

    return account is not None


# ============================================================
# PASSWORD AUTHENTICATION
# ============================================================

def authenticate_player(
    player_name: str,
    password: str,
) -> dict[str, Any]:
    """
    Authenticate a player against AuthMe.

    Returns a safe result object.

    Success:
        {
            "success": True,
            "player_name": "...",
            "message": "Login successful."
        }

    Failure:
        {
            "success": False,
            "player_name": "...",
            "message": "Invalid Minecraft name or password."
        }

    IMPORTANT:
    The supplied password is never written to disk,
    database, logs, or response data.
    """

    generic_error = "Invalid Minecraft name or password."

    # --------------------------------------------------------
    # Validate username
    # --------------------------------------------------------

    if not validate_player_name(player_name):
        return {
            "success": False,
            "player_name": "",
            "message": generic_error,
        }

    player_name = player_name.strip()

    # --------------------------------------------------------
    # Validate password
    # --------------------------------------------------------

    if not isinstance(password, str):
        return {
            "success": False,
            "player_name": player_name,
            "message": generic_error,
        }

    if not password:
        return {
            "success": False,
            "player_name": player_name,
            "message": generic_error,
        }

    # --------------------------------------------------------
    # Get AuthMe account
    # --------------------------------------------------------

    account = get_authme_account(player_name)

    if account is None:
        return {
            "success": False,
            "player_name": player_name,
            "message": generic_error,
        }

    stored_hash = account.get("password_hash")

    if not stored_hash:
        return {
            "success": False,
            "player_name": player_name,
            "message": generic_error,
        }

    # --------------------------------------------------------
    # Verify SHA256
    # --------------------------------------------------------

    if HASH_ALGORITHM == "SHA256":

        valid = verify_sha256_password(
            password,
            stored_hash,
        )

    else:
        # Fail closed if the configured algorithm changes.
        valid = False

    # --------------------------------------------------------
    # Authentication result
    # --------------------------------------------------------

    if not valid:
        return {
            "success": False,
            "player_name": player_name,
            "message": generic_error,
        }

    return {
        "success": True,
        "player_name": account["username"],
        "message": "Login successful.",
    }


# ============================================================
# SIMPLE BOOLEAN AUTHENTICATION
# ============================================================

def check_password(
    player_name: str,
    password: str,
) -> bool:
    """
    Convenience function.

    Returns only True/False.
    """

    result = authenticate_player(
        player_name,
        password,
    )

    return bool(result.get("success"))


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

def check_authme_connection() -> dict[str, Any]:
    """
    Check whether auth.py can access the AuthMe database.

    This does NOT expose password hashes.
    """

    result = {
        "database": str(AUTHME_DB),
        "exists": False,
        "connected": False,
        "table_exists": False,
        "error": None,
    }

    if not AUTHME_DB.is_file():
        result["error"] = (
            "AuthMe SQLite database was not found."
        )
        return result

    result["exists"] = True

    connection: Optional[sqlite3.Connection] = None

    try:
        connection = _connect()

        result["connected"] = True

        cursor = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
            """,
            (AUTHME_TABLE,),
        )

        result["table_exists"] = cursor.fetchone() is not None

        if not result["table_exists"]:
            result["error"] = (
                f"AuthMe table '{AUTHME_TABLE}' was not found."
            )

    except sqlite3.Error as exc:
        result["error"] = str(exc)

    finally:
        if connection is not None:
            connection.close()

    return result


# ============================================================
# DEBUG-SAFE INFORMATION
# ============================================================

def get_auth_info() -> dict[str, Any]:
    """
    Return safe configuration information.

    Never returns:
        - passwords
        - password hashes
        - database credentials
    """

    return {
        "database_type": "SQLITE",
        "database_path": str(AUTHME_DB),
        "table": AUTHME_TABLE,
        "username_column": USERNAME_COLUMN,
        "password_column": PASSWORD_COLUMN,
        "hash_algorithm": HASH_ALGORITHM,
        "read_only": True,
        "plaintext_password_storage": False,
    }


# ============================================================
# MODULE EXPORTS
# ============================================================

__all__ = [
    "authenticate_player",
    "check_password",
    "check_authme_connection",
    "get_auth_info",
    "get_authme_account",
    "get_authme_database_path",
    "hash_password_sha256",
    "player_registered",
    "validate_player_name",
    "verify_sha256_password",
]