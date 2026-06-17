"""
IB Gateway Data Client Package
================================
Production-grade IBKR data client with automatic reconnection and option Greeks.

Quick start:
    from data_client.ibkr_client import IBKRClient, ClientConfig
    from data_client.option_chain import OptionChainFetcher
    from data_client.reconnect import ReconnectManager, ReconnectConfig
"""

__version__ = "1.0.0"
__all__ = ["IBKRClient", "ClientConfig", "OptionChainFetcher", "ReconnectManager", "ReconnectConfig"]
