"""
Unit tests for broker endpoints
Tests broker integration with mocked ccxt responses
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime

from ..api.main import app
from ..api.broker_endpoints import BrokerManager


@pytest.fixture
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def mock_ccxt():
    """Mock ccxt exchange instance"""
    mock_exchange = AsyncMock()
    mock_exchange.fetch_ohlcv = AsyncMock(return_value=[
        [1609459200000, 29000, 29500, 28800, 29200, 1000],
        [1609462800000, 29200, 29800, 29100, 29500, 1200],
        [1609466400000, 29500, 30000, 29400, 29800, 1100],
    ])
    mock_exchange.fetch_ticker = AsyncMock(return_value={
        'last': 29800,
        'bid': 29795,
        'ask': 29805,
        'high': 30000,
        'low': 28800,
        'baseVolume': 3300,
        'timestamp': 1609466400000
    })
    return mock_exchange


class TestBrokerEndpoints:
    """Test suite for broker API endpoints"""

    @patch('backend.api.broker_endpoints.ccxt_async')
    def test_get_ohlcv_kraken(self, mock_ccxt_module, client, mock_ccxt):
        """Test OHLCV fetch from Kraken"""
        mock_ccxt_module.kraken.return_value = mock_ccxt

        response = client.get(
            "/api/broker/kraken/ohlcv/BTC/USD",
            params={"timeframe": "1h", "limit": 100}
        )

        assert response.status_code == 200
        data = response.json()

        assert data['exchange'] == 'kraken'
        assert data['symbol'] == 'BTC/USD'
        assert data['timeframe'] == '1h'
        assert len(data['data']) == 3
        assert data['data'][0]['open'] == 29000

    @patch('backend.api.broker_endpoints.ccxt_async')
    def test_get_ohlcv_invalid_exchange(self, mock_ccxt_module, client):
        """Test error handling for invalid exchange"""
        response = client.get(
            "/api/broker/invalid/ohlcv/BTC/USD"
        )

        assert response.status_code == 404

    def test_ohlcv_format_conversion(self, mock_ccxt):
        """Test OHLCV data format conversion to TradingView format"""
        raw_ohlcv = [
            [1609459200000, 29000, 29500, 28800, 29200, 1000]
        ]

        # Expected TradingView format
        expected = {
            "time": 1609459200,  # Converted to seconds
            "open": 29000,
            "high": 29500,
            "low": 28800,
            "close": 29200,
            "volume": 1000
        }

        formatted = {
            "time": raw_ohlcv[0][0] / 1000,
            "open": raw_ohlcv[0][1],
            "high": raw_ohlcv[0][2],
            "low": raw_ohlcv[0][3],
            "close": raw_ohlcv[0][4],
            "volume": raw_ohlcv[0][5]
        }

        assert formatted == expected


class TestBrokerManager:
    """Test BrokerManager class"""

    @patch('backend.api.broker_endpoints.settings')
    @patch('backend.api.broker_endpoints.ccxt_async')
    def test_initialize_exchanges(self, mock_ccxt, mock_settings):
        """Test exchange initialization with API keys"""
        mock_settings.KRAKEN_API_KEY = "test_key"
        mock_settings.KRAKEN_API_SECRET = "test_secret"
        mock_settings.COINBASE_API_KEY = None
        mock_settings.COINBASE_API_SECRET = None

        manager = BrokerManager()

        assert 'kraken' in manager.exchanges
        assert 'coinbase' not in manager.exchanges

    def test_get_exchange_not_configured(self):
        """Test error when accessing unconfigured exchange"""
        manager = BrokerManager()
        manager.exchanges = {}

        with pytest.raises(Exception):
            manager.get_exchange('kraken')


@pytest.mark.asyncio
async def test_fetch_ticker():
    """Test ticker data fetching"""
    mock_exchange = AsyncMock()
    mock_exchange.fetch_ticker = AsyncMock(return_value={
        'last': 29800,
        'bid': 29795,
        'ask': 29805
    })

    ticker = await mock_exchange.fetch_ticker('BTC/USD')

    assert ticker['last'] == 29800
    assert ticker['bid'] == 29795
    assert ticker['ask'] == 29805
