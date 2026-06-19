import importlib
import sys
import types


def test_database_settings_bounds(monkeypatch):
    from app.core import db

    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    monkeypatch.setenv("DB_POOL_MIN_SIZE", "3")
    monkeypatch.setenv("DB_POOL_MAX_SIZE", "2")
    monkeypatch.setenv("DB_STATEMENT_TIMEOUT_MS", "50")
    monkeypatch.setenv("DB_COMMAND_TIMEOUT_SECONDS", "0")
    monkeypatch.setenv("DB_IDLE_TX_TIMEOUT_MS", "10")

    settings = db.get_database_settings()

    assert settings.enabled is True
    assert settings.min_size == 3
    assert settings.max_size == 3
    assert settings.statement_timeout_ms == 100
    assert settings.command_timeout == 0.1
    assert settings.idle_in_transaction_session_timeout_ms == 1000
    assert settings.slow_query_ms == 500.0


async def _fake_init(connection):
    await connection.execute("SET statement_timeout = $1;", 1)


def test_init_db_pool_uses_asyncpg_pool_settings(monkeypatch):
    calls = {}
    fake_asyncpg = types.SimpleNamespace()

    async def close_pool():
        return None

    async def create_pool(**kwargs):
        calls.update(kwargs)
        return types.SimpleNamespace(close=close_pool)

    fake_asyncpg.create_pool = create_pool

    from app.core import db

    monkeypatch.setattr(db, "asyncpg", fake_asyncpg)
    monkeypatch.setattr(db, "_pool", None)
    settings = db.DatabaseSettings(
        url="postgres://example",
        min_size=2,
        max_size=6,
        command_timeout=3.5,
        statement_timeout_ms=3500,
        idle_in_transaction_session_timeout_ms=9000,
    )

    import asyncio

    pool = asyncio.run(db.init_db_pool(settings))

    assert pool is not None
    assert calls["dsn"] == "postgres://example"
    assert calls["min_size"] == 2
    assert calls["max_size"] == 6
    assert calls["command_timeout"] == 3.5
    assert calls["max_inactive_connection_lifetime"] == 300.0
    assert callable(calls["init"])


def test_schema_defines_query_friendly_indexes():
    from app.services import db_schema

    ddl = "\n".join(db_schema.SCHEMA_STATEMENTS)

    assert "idx_macro_indicator_id_time_desc" in ddl
    assert "idx_chain_ticker_expiry_time_desc" in ddl
    assert "idx_chain_data_gin" in ddl
    assert "idx_composite_score_time_desc" in ddl
    assert "idx_api_query_performance_name_time_desc" in ddl


def test_slow_query_metric_emits_warning(monkeypatch, caplog):
    import asyncio
    import logging
    from app.core import db

    monkeypatch.setattr(db, "_pool_settings", db.DatabaseSettings(url="postgres://example", slow_query_ms=1.0))

    async def scenario():
        with caplog.at_level(logging.WARNING, logger="app.core.db"):
            await db._record_query_metrics("SELECT * FROM options_chain_snapshots", 12.5, 3, 2.0)

    asyncio.run(scenario())

    assert any(record.event == "slow_query" for record in caplog.records)
    assert any("options_chain_snapshots" in record.query for record in caplog.records)
