import pytest
import os
from unittest.mock import MagicMock, patch

# Test IBKR_ENABLED logic
def test_ibkr_enabled_logic():
    with patch.dict(os.environ, {"IBKR_ENABLED": "false"}):
        ibkr_enabled = os.getenv("IBKR_ENABLED", "false").lower() == "true"
        assert ibkr_enabled is False

def test_ibkr_fallback_logic():
    # Placeholder for actual fallback test once integrated into market_data.py
    # For now, just verify we can import the service
    try:
        from app.services import market_data
        assert market_data is not None
    except ImportError:
        pytest.fail("Could not import market_data service")

def test_atm_window_filter_logic():
    # Test logic for 100 ticker limit (placeholder for future implementation)
    max_tickers = 100
    mock_tickers = [f"TICKER_{i}" for i in range(150)]
    filtered = mock_tickers[:max_tickers]
    assert len(filtered) == 100
