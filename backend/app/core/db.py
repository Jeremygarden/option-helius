"""Async TimescaleDB/PostgreSQL pool and query helpers.

This module centralizes database access so future persistent storage code does not
open ad-hoc connections without timeouts. DATABASE_URL is optional; when absent,
the backend continues to run Redis/upstream-only paths.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator, Iterable, Optional, Sequence

try:  # pragma: no cover - tests may stub optional deps
    import asyncpg
except ImportError:  # pragma: no cover
    asyncpg = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DatabaseSettings:
    """Database connection-pool and timeout settings."""

    url: str = ""
    min_size: int = 1
    max_size: int = 8
    command_timeout: float = 5.0
    statement_timeout_ms: int = 5_000
    idle_in_transaction_session_timeout_ms: int = 10_000
    max_inactive_connection_lifetime: float = 300.0

    @property
    def enabled(self) -> bool:
        return bool(self.url)


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, value, default)
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, value, default)
        return default


def get_database_settings() -> DatabaseSettings:
    """Load database settings from environment with bounded defaults."""

    min_size = max(1, _env_int("DB_POOL_MIN_SIZE", 1))
    max_size = max(min_size, _env_int("DB_POOL_MAX_SIZE", 8))
    statement_timeout_ms = max(100, _env_int("DB_STATEMENT_TIMEOUT_MS", 5_000))
    command_timeout = max(0.1, _env_float("DB_COMMAND_TIMEOUT_SECONDS", statement_timeout_ms / 1000))
    return DatabaseSettings(
        url=os.getenv("DATABASE_URL", "").strip(),
        min_size=min_size,
        max_size=max_size,
        command_timeout=command_timeout,
        statement_timeout_ms=statement_timeout_ms,
        idle_in_transaction_session_timeout_ms=max(1_000, _env_int("DB_IDLE_TX_TIMEOUT_MS", 10_000)),
        max_inactive_connection_lifetime=max(30.0, _env_float("DB_MAX_INACTIVE_CONNECTION_LIFETIME", 300.0)),
    )


_pool: Optional[Any] = None
_pool_settings: Optional[DatabaseSettings] = None


async def _configure_connection(connection: Any, settings: DatabaseSettings) -> None:
    await connection.execute(
        "SET statement_timeout = $1; SET idle_in_transaction_session_timeout = $2;",
        settings.statement_timeout_ms,
        settings.idle_in_transaction_session_timeout_ms,
    )


async def init_db_pool(settings: DatabaseSettings | None = None) -> Optional[Any]:
    """Initialize the app-wide asyncpg pool if DATABASE_URL is configured."""

    global _pool, _pool_settings
    settings = settings or get_database_settings()
    _pool_settings = settings

    if not settings.enabled:
        logger.info("DATABASE_URL not configured; TimescaleDB pool disabled")
        return None
    if asyncpg is None:
        logger.warning("asyncpg is not installed; TimescaleDB pool disabled")
        return None
    if _pool is not None:
        return _pool

    async def init_connection(connection: Any) -> None:
        await _configure_connection(connection, settings)

    _pool = await asyncpg.create_pool(
        dsn=settings.url,
        min_size=settings.min_size,
        max_size=settings.max_size,
        command_timeout=settings.command_timeout,
        max_inactive_connection_lifetime=settings.max_inactive_connection_lifetime,
        init=init_connection,
    )
    logger.info(
        "TimescaleDB pool initialized (min=%s max=%s command_timeout=%ss statement_timeout=%sms)",
        settings.min_size,
        settings.max_size,
        settings.command_timeout,
        settings.statement_timeout_ms,
    )
    return _pool


async def close_db_pool() -> None:
    """Close the app-wide asyncpg pool."""

    global _pool
    if _pool is None:
        return
    await _pool.close()
    _pool = None
    logger.info("TimescaleDB pool closed")


def get_db_pool() -> Optional[Any]:
    return _pool


@asynccontextmanager
async def acquire_db(timeout: float | None = None) -> AsyncIterator[Any]:
    """Acquire a DB connection with an explicit acquisition timeout."""

    if _pool is None:
        raise RuntimeError("TimescaleDB pool is not initialized")
    acquire_timeout = timeout if timeout is not None else (_pool_settings.command_timeout if _pool_settings else 5.0)
    async with _pool.acquire(timeout=acquire_timeout) as connection:
        yield connection


async def fetch(sql: str, *args: Any, timeout: float | None = None) -> list[Any]:
    async with acquire_db(timeout=timeout) as connection:
        return await connection.fetch(sql, *args, timeout=timeout)


async def fetchrow(sql: str, *args: Any, timeout: float | None = None) -> Any:
    async with acquire_db(timeout=timeout) as connection:
        return await connection.fetchrow(sql, *args, timeout=timeout)


async def execute(sql: str, *args: Any, timeout: float | None = None) -> str:
    async with acquire_db(timeout=timeout) as connection:
        return await connection.execute(sql, *args, timeout=timeout)


async def execute_many(statements: Iterable[str], *, timeout: float | None = None) -> None:
    async with acquire_db(timeout=timeout) as connection:
        for statement in statements:
            await connection.execute(statement, timeout=timeout)


async def copy_records_to_table(table_name: str, records: Sequence[tuple[Any, ...]], columns: Sequence[str]) -> str:
    """COPY helper for high-throughput TimescaleDB ingestion."""

    async with acquire_db() as connection:
        return await connection.copy_records_to_table(table_name, records=records, columns=columns)
