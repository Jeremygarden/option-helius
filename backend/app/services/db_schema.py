"""TimescaleDB schema and index management for Option Helius.

Current hot-path data still uses Redis and upstream providers, but Docker already
provisions TimescaleDB. Keeping executable schema and indexes here ensures the
first persistent writes land on hypertables with query-friendly indexes instead
of future ad-hoc tables/full scans.
"""

from __future__ import annotations

from typing import Any, Iterable

from ..core.db import execute_many

SCHEMA_STATEMENTS: tuple[str, ...] = (
    "CREATE EXTENSION IF NOT EXISTS timescaledb;",
    """
    CREATE TABLE IF NOT EXISTS macro_indicator_history (
        indicator_id TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        value DOUBLE PRECISION,
        source TEXT DEFAULT 'api',
        metadata JSONB DEFAULT '{}'::jsonb,
        PRIMARY KEY (indicator_id, timestamp)
    );
    """,
    """
    SELECT create_hypertable(
        'macro_indicator_history',
        'timestamp',
        if_not_exists => TRUE,
        migrate_data => TRUE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_macro_indicator_id_time_desc
        ON macro_indicator_history (indicator_id, timestamp DESC);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_macro_indicator_source_time_desc
        ON macro_indicator_history (source, timestamp DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS options_chain_snapshots (
        ticker TEXT NOT NULL,
        expiry DATE NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        spot DOUBLE PRECISION,
        data JSONB NOT NULL,
        source TEXT DEFAULT 'yfinance',
        PRIMARY KEY (ticker, expiry, timestamp)
    );
    """,
    """
    SELECT create_hypertable(
        'options_chain_snapshots',
        'timestamp',
        if_not_exists => TRUE,
        migrate_data => TRUE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_chain_ticker_expiry_time_desc
        ON options_chain_snapshots (ticker, expiry, timestamp DESC);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_chain_ticker_time_desc
        ON options_chain_snapshots (ticker, timestamp DESC);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_chain_data_gin
        ON options_chain_snapshots USING GIN (data jsonb_path_ops);
    """,
    """
    CREATE TABLE IF NOT EXISTS composite_score_history (
        timestamp TIMESTAMPTZ NOT NULL PRIMARY KEY,
        score DOUBLE PRECISION NOT NULL,
        signal TEXT,
        indicator_weights JSONB DEFAULT '{}'::jsonb,
        raw_scores JSONB DEFAULT '{}'::jsonb
    );
    """,
    """
    SELECT create_hypertable(
        'composite_score_history',
        'timestamp',
        if_not_exists => TRUE,
        migrate_data => TRUE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_composite_score_time_desc
        ON composite_score_history (timestamp DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS api_query_performance (
        id BIGSERIAL PRIMARY KEY,
        query_name TEXT NOT NULL,
        duration_ms DOUBLE PRECISION NOT NULL,
        row_count INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        metadata JSONB DEFAULT '{}'::jsonb
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_api_query_performance_name_time_desc
        ON api_query_performance (query_name, created_at DESC);
    """,
)

ROLLUP_STATEMENTS: tuple[str, ...] = (
    """
    CREATE MATERIALIZED VIEW IF NOT EXISTS macro_indicator_daily
    WITH (timescaledb.continuous) AS
    SELECT
        indicator_id,
        time_bucket('1 day', timestamp) AS bucket,
        avg(value) AS avg_value,
        min(value) AS min_value,
        max(value) AS max_value,
        last(value, timestamp) AS close_value
    FROM macro_indicator_history
    GROUP BY indicator_id, bucket
    WITH NO DATA;
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_macro_indicator_daily_id_bucket_desc
        ON macro_indicator_daily (indicator_id, bucket DESC);
    """,
)


async def init_timescale_schema(*, include_rollups: bool = True, timeout: float | None = None) -> None:
    """Create/upgrade tables, hypertables, and indexes.

    Uses the central DB helper so every DDL statement inherits pool-level
    command_timeout and Postgres statement_timeout settings.
    """

    statements: Iterable[str] = SCHEMA_STATEMENTS + (ROLLUP_STATEMENTS if include_rollups else ())
    await execute_many(statements, timeout=timeout)


async def explain_query(sql: str, *args: Any, analyze: bool = False, timeout: float | None = None) -> list[Any]:
    """Return an EXPLAIN plan through the timeout-bound pool helper."""

    from ..core.db import fetch

    prefix = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)" if analyze else "EXPLAIN (FORMAT JSON)"
    return await fetch(f"{prefix} {sql}", *args, timeout=timeout)
