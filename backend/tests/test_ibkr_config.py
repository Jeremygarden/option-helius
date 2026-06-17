import os
from unittest.mock import patch

from app.core.config import get_settings


def _fresh_settings(env):
    get_settings.cache_clear()
    with patch.dict(os.environ, env, clear=False):
        settings = get_settings()
    get_settings.cache_clear()
    return settings


def test_ibkr_config_safe_defaults():
    settings = _fresh_settings({
        "IBKR_ENABLED": "",
        "IBKR_HOST": "",
        "IBKR_PORT": "",
        "IBKR_CLIENT_ID": "",
        "IBKR_ACCOUNT_TYPE": "",
    })

    assert settings.ibkr_enabled is False
    assert settings.ibkr_host == "localhost"
    assert settings.ibkr_port == 4002
    assert settings.ibkr_client_id == 1
    assert settings.ibkr_account_type == "paper"
    assert settings.ibkr_connect_timeout == 30.0
    assert settings.ibkr_readonly is True


def test_ibkr_config_env_overrides_and_client_kwargs():
    settings = _fresh_settings({
        "IBKR_ENABLED": "true",
        "IBKR_HOST": "ibgateway",
        "IBKR_PORT": "4001",
        "IBKR_CLIENT_ID": "7",
        "IBKR_ACCOUNT_TYPE": "live",
        "IBKR_CONNECT_TIMEOUT": "12.5",
        "IBKR_READONLY": "false",
    })

    assert settings.ibkr_enabled is True
    assert settings.ibkr_host == "ibgateway"
    assert settings.ibkr_port == 4001
    assert settings.ibkr_client_id == 7
    assert settings.ibkr_account_type == "live"
    assert settings.ibkr_client_config == {
        "host": "ibgateway",
        "port": 4001,
        "client_id": 7,
        "connect_timeout": 12.5,
        "readonly": False,
    }


def test_ibkr_config_invalid_values_fallback_to_safe_defaults():
    settings = _fresh_settings({
        "IBKR_PORT": "not-a-port",
        "IBKR_CLIENT_ID": "nan",
        "IBKR_ACCOUNT_TYPE": "margin",
        "IBKR_CONNECT_TIMEOUT": "slow",
    })

    assert settings.ibkr_port == 4002
    assert settings.ibkr_client_id == 1
    assert settings.ibkr_account_type == "paper"
    assert settings.ibkr_connect_timeout == 30.0
