"""
TimescaleDB schema and index definitions for Option Helius.

Currently unused — the app stores all data in Redis cache and fetches
from upstream APIs (yfinance, IBKR, FRED). This module defines the
schema that will be needed when persistent historical storage is added.

Usage:
    Run via: python -m backend.app.services.db_init
    Or import init_db() in the app startup lifecycle.
"""

# Planned table definitions for future implementation:
#
# CREATE TABLE IF NOT EXISTS macro_indicator_history (
#     indicator_id TEXT NOT NULL,
#     timestamp TIMESTAMPTZ NOT NULL,
#     value DOUBLE PRECISION,
#     source TEXT DEFAULT 'api',
#     PRIMARY KEY (indicator_id, timestamp)
# );
# SELECT create_hypertable('macro_indicator_history', 'timestamp',
#        if_not_exists => TRUE);
# CREATE INDEX IF NOT EXISTS idx_macro_indicator_id_time
#     ON macro_indicator_history (indicator_id, timestamp DESC);
#
# CREATE TABLE IF NOT EXISTS options_chain_snapshots (
#     ticker TEXT NOT NULL,
#     expiry DATE NOT NULL,
#     timestamp TIMESTAMPTZ NOT NULL,
#     data JSONB NOT NULL,
#     source TEXT DEFAULT 'yfinance',
#     PRIMARY KEY (ticker, expiry, timestamp)
# );
# SELECT create_hypertable('options_chain_snapshots', 'timestamp',
#        if_not_exists => TRUE);
# CREATE INDEX IF NOT EXISTS idx_chain_ticker_time
#     ON options_chain_snapshots (ticker, timestamp DESC);
#
# CREATE TABLE IF NOT EXISTS composite_score_history (
#     timestamp TIMESTAMPTZ NOT NULL PRIMARY KEY,
#     score DOUBLE PRECISION NOT NULL,
#     indicator_weights JSONB,
#     raw_scores JSONB
# );
# SELECT create_hypertable('composite_score_history', 'timestamp',
#        if_not_exists => TRUE);

# Note: All current data access goes through Redis cache.
# When TimescaleDB integration is implemented:
# 1. Use asyncpg or psycopg3 async for all queries
# 2. Batch inserts with COPY for high-throughput snapshot ingestion
# 3. Use TimescaleDB continuous aggregates for rollup queries
# 4. Add time_bucket() queries for historical chart data
