"""
Integration tests for chart data aggregation
Tests end-to-end data flow from brokers/fallback to TradingView format
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from ..api.main import app
from ..models.market_data import OHLCVCandle


@pytest.fixture
def client():
    return TestClient(app)


class TestChartDataEndpoint:
    """Test unified chart data endpoint"""

    @patch('backend.api.chart_data._fetch_coingecko_data')
    def test_get_chart_data_coingecko(self, mock_fetch, client):
        """Test chart data from CoinGecko fallback"""
        mock_fetch.return_value = [
            OHLCVCandle(
                time=1609459200,
                open=29000,
                high=29500,
                low=28800,
                close=29200,
                volume=1000
            )
        ]

        response = client.get(
            "/api/chart/data/BTC/USD",
            params={
                "timeframe": "1h",
                "source": "coingecko",
                "include_alerts": False
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data['symbol'] == 'BTC/USD'
        assert data['source'] == 'coingecko'
        assert len(data['candles']) == 1

    @patch('backend.api.chart_data.get_resonance_bridge')
    @patch('backend.api.chart_data._fetch_coingecko_data')
    def test_get_chart_data_with_alerts(self, mock_fetch, mock_resonance, client):
        """Test chart data with Resonance alerts"""
        # Mock OHLCV data
        mock_fetch.return_value = [
            OHLCVCandle(
                time=1609459200,
                open=29000,
                high=29500,
                low=28800,
                close=29200,
                volume=1000
            )
        ]

        # Mock Resonance alerts
        mock_bridge = AsyncMock()
        mock_bridge.get_alerts = AsyncMock(return_value=[
            {
                "time": 1609459200,
                "symbol": "BTC/USD",
                "signal": "breakout",
                "confidence": 0.95
            }
        ])
        mock_resonance.return_value = mock_bridge

        response = client.get(
            "/api/chart/data/BTC/USD",
            params={
                "timeframe": "1h",
                "source": "coingecko",
                "include_alerts": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data['markers'] is not None
        # Markers should be formatted for TradingView

    def test_get_supported_timeframes(self, client):
        """Test timeframe listing endpoint"""
        response = client.get("/api/chart/timeframes")

        assert response.status_code == 200
        data = response.json()

        assert 'timeframes' in data
        timeframes = [tf['value'] for tf in data['timeframes']]
        assert '1h' in timeframes
        assert '1d' in timeframes


class TestMarkerFormatting:
    """Test Resonance alert to TradingView marker conversion"""

    def test_format_breakout_marker(self):
        """Test breakout alert formatting"""
        from ..api.chart_data import _format_resonance_markers

        alerts = [
            {
                "time": 1609459200,
                "symbol": "BTC/USD",
                "signal": "breakout",
                "confidence": 0.95
            }
        ]

        markers = _format_resonance_markers(alerts, [])

        assert len(markers) == 1
        assert markers[0]['color'] == '#00ff00'
        assert markers[0]['shape'] == 'arrowUp'
        assert 'Breakout' in markers[0]['text']

    def test_format_multiple_signals(self):
        """Test multiple alert types"""
        from ..api.chart_data import _format_resonance_markers

        alerts = [
            {"time": 1, "signal": "breakout", "confidence": 0.9},
            {"time": 2, "signal": "breakdown", "confidence": 0.85},
            {"time": 3, "signal": "support", "confidence": 0.8},
            {"time": 4, "signal": "resistance", "confidence": 0.75}
        ]

        markers = _format_resonance_markers(alerts, [])

        assert len(markers) == 4
        assert markers[0]['shape'] == 'arrowUp'
        assert markers[1]['shape'] == 'arrowDown'
        assert markers[2]['shape'] == 'circle'
        assert markers[3]['shape'] == 'circle'


@pytest.mark.asyncio
async def test_coingecko_fallback():
    """Test CoinGecko data fetching"""
    from ..api.chart_data import _fetch_coingecko_data

    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value=[
            [1609459200000, 29000, 29500, 28800, 29200],
            [1609462800000, 29200, 29800, 29100, 29500]
        ])
        mock_get.return_value.__aenter__.return_value = mock_response

        candles = await _fetch_coingecko_data("BTC/USD", "1h", 100)

        assert len(candles) == 2
        assert candles[0].time == 1609459200  # Converted to seconds
        assert candles[0].open == 29000
