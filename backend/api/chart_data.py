"""
Chart data aggregation endpoint
Combines broker data, Resonance.ai alerts, and ML predictions
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import datetime

from .config import settings
from ..models.market_data import ChartDataResponse, OHLCVCandle
from ..bridges.resonance_bridge import ResonanceBridge, get_resonance_bridge
from ..bridges.tradingview_bridge import TradingViewBridge

router = APIRouter()


def _normalize_symbol_for_resonance(symbol: str) -> str:
    """
    Convert CoinGecko-style symbol names to exchange trading pairs

    Examples:
        bitcoin -> BTC/USD
        ethereum -> ETH/USD
        BTC-USD -> BTC/USD
    """
    symbol_map = {
        "bitcoin": "BTC/USD",
        "btc": "BTC/USD",
        "ethereum": "ETH/USD",
        "eth": "ETH/USD",
        "binancecoin": "BNB/USD",
        "bnb": "BNB/USD",
        "cardano": "ADA/USD",
        "ada": "ADA/USD",
        "solana": "SOL/USD",
        "sol": "SOL/USD",
    }

    # Check if it's already in the correct format
    if "/" in symbol or "-" in symbol:
        return symbol.replace("-", "/")

    # Normalize to lowercase for lookup
    normalized = symbol.lower()

    # Return mapped symbol or uppercase the input
    return symbol_map.get(normalized, symbol.upper())


@router.get("/data/{symbol}")
async def get_chart_data(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe (1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(500, ge=1, le=5000),
    source: str = Query("coingecko", description="Data source (coingecko or broker name)"),
    include_alerts: bool = Query(True, description="Include Resonance.ai alerts"),
    include_ml: bool = Query(False, description="Include ML predictions")
) -> ChartDataResponse:
    """
    Unified chart data endpoint for TradingView frontend

    Aggregates:
    - OHLCV data from broker or fallback source
    - Resonance.ai breakout/alert markers
    - ML strategy predictions (optional)

    Returns data in TradingView lightweight-charts compatible format
    """

    candles = []

    # Fetch OHLCV data
    if source != "coingecko" and settings.ENABLE_BROKERS:
        # Use broker endpoint
        from .broker_endpoints import get_broker_manager, get_ohlcv

        try:
            broker_manager = get_broker_manager()
            response = await get_ohlcv(
                exchange=source,
                symbol=symbol,
                timeframe=timeframe,
                limit=limit,
                broker_manager=broker_manager
            )
            candles = response.data
        except Exception as e:
            # Fallback to CoinGecko
            candles = await _fetch_coingecko_data(symbol, timeframe, limit)
            source = "coingecko"
    else:
        # Use CoinGecko fallback
        candles = await _fetch_coingecko_data(symbol, timeframe, limit)
        source = "coingecko"

    # Fetch Resonance.ai alerts
    markers = None
    if include_alerts and settings.ENABLE_RESONANCE:
        try:
            resonance = get_resonance_bridge()
            # Normalize symbol for Resonance API (bitcoin -> BTC/USD)
            normalized_symbol = _normalize_symbol_for_resonance(symbol)
            alerts = await resonance.get_alerts(symbol=normalized_symbol, timeframe=timeframe)
            markers = _format_resonance_markers(alerts, candles)
        except Exception as e:
            # Non-blocking: continue without alerts
            print(f"Resonance alerts unavailable: {e}")

    # ML predictions
    indicators = None
    if include_ml and settings.ENABLE_ML_STRATEGIES:
        indicators = _generate_ml_predictions(candles)

    return ChartDataResponse(
        symbol=symbol,
        timeframe=timeframe,
        candles=candles,
        indicators=indicators,
        markers=markers,
        source=source
    )


async def _fetch_coingecko_data(symbol: str, timeframe: str, limit: int) -> List[OHLCVCandle]:
    """
    Fallback data fetcher using CoinGecko API
    Used when brokers are disabled or as backup
    """
    import aiohttp

    # Convert symbol format (BTC/USD -> bitcoin)
    coin_id_map = {
        "BTC/USD": "bitcoin",
        "ETH/USD": "ethereum",
        "BTC/USDT": "bitcoin",
        "ETH/USDT": "ethereum",
        # Add more mappings as needed
    }

    coin_id = coin_id_map.get(symbol, symbol.split('/')[0].lower())

    # Convert timeframe to CoinGecko days parameter
    timeframe_to_days = {
        "1m": 1,
        "5m": 1,
        "15m": 1,
        "1h": 7,
        "4h": 30,
        "1d": 365
    }
    days = timeframe_to_days.get(timeframe, 7)

    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
    params = {
        "vs_currency": "usd",
        "days": days
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=503,
                    detail=f"CoinGecko API error: {response.status}"
                )

            data = await response.json()

            # Transform to our format
            candles = [
                OHLCVCandle(
                    time=candle[0] / 1000,  # Convert ms to seconds
                    open=candle[1],
                    high=candle[2],
                    low=candle[3],
                    close=candle[4],
                    volume=0  # CoinGecko OHLC doesn't include volume in this endpoint
                )
                for candle in data[:limit]
            ]

            return candles


def _format_resonance_markers(alerts: List, candles: List[OHLCVCandle]) -> List[dict]:
    """
    Convert Resonance.ai alerts to TradingView marker format

    IMPORTANT: Snaps alert timestamps to nearest candle to prevent stacking/misalignment

    Resonance schema: {"time": unix_timestamp, "symbol": "BTC", "signal": "breakout", "confidence": 0.95}
    TradingView marker: {"time": unix_timestamp, "position": "aboveBar", "color": "green", "shape": "arrowUp", "text": "Breakout"}
    """
    if not candles:
        return []

    markers = []

    # Create a set of candle times for quick lookup
    candle_times = [int(candle.time) for candle in candles]
    candle_time_set = set(candle_times)

    for alert in alerts:
        # alert is a ResonanceAlert Pydantic model
        signal_type = alert.signal
        alert_time = int(alert.time)

        # Snap alert time to nearest candle
        # This prevents markers from appearing at wrong positions or stacking
        snapped_time = _find_nearest_candle_time(alert_time, candle_times, candle_time_set)

        # Skip if no suitable candle found (alert too far outside chart range)
        if snapped_time is None:
            continue

        # Map signal types to visual markers
        marker_config = {
            "breakout": {"color": "#00ff00", "shape": "arrowUp", "position": "belowBar"},
            "breakdown": {"color": "#ff0000", "shape": "arrowDown", "position": "aboveBar"},
            "support": {"color": "#00aaff", "shape": "circle", "position": "belowBar"},
            "resistance": {"color": "#ff00aa", "shape": "circle", "position": "aboveBar"}
        }

        config = marker_config.get(signal_type, {"color": "#888888", "shape": "circle", "position": "belowBar"})

        markers.append({
            "time": snapped_time,  # Use snapped time instead of original
            "position": config["position"],
            "color": config["color"],
            "shape": config["shape"],
            "text": f"({alert.confidence:.0%})",
            "signal_type": signal_type  # Add signal type for legend
        })

    return markers


def _find_nearest_candle_time(alert_time: int, candle_times: List[int], candle_time_set: set) -> Optional[int]:
    """
    Find the nearest candle time to an alert timestamp

    Args:
        alert_time: Alert timestamp in seconds
        candle_times: Sorted list of candle timestamps
        candle_time_set: Set of candle times for O(1) lookup

    Returns:
        Nearest candle time, or None if alert is too far from any candle
    """
    # If exact match, use it
    if alert_time in candle_time_set:
        return alert_time

    # Find nearest candle using binary search approach
    min_diff = float('inf')
    nearest_time = None

    for candle_time in candle_times:
        diff = abs(candle_time - alert_time)

        if diff < min_diff:
            min_diff = diff
            nearest_time = candle_time
        elif diff > min_diff:
            # Since candle_times is sorted, we can break early
            break

    # Only return if within reasonable range (e.g., 7 days)
    max_allowed_diff = 7 * 24 * 60 * 60  # 7 days in seconds
    if min_diff <= max_allowed_diff:
        return nearest_time

    return None


def _generate_ml_predictions(candles: List[OHLCVCandle]) -> dict:
    """
    Generate mock ML predictions for demonstration
    In production, this would call actual ML models from strategy_engine.py
    """
    import random

    if len(candles) < 20:
        return None

    # Get last 20 candles for prediction context
    recent_candles = candles[-20:]
    last_close = recent_candles[-1].close

    # Generate prediction line (mock trend continuation with some variance)
    prediction_data = []
    confidence_upper = []
    confidence_lower = []

    for i, candle in enumerate(recent_candles):
        # Mock prediction: slight upward trend with random walk
        trend_factor = 1 + (i * 0.001)  # 0.1% increase per candle
        noise = random.uniform(-0.01, 0.01)  # ±1% random noise

        predicted_value = candle.close * trend_factor * (1 + noise)

        # Confidence band (±2% around prediction)
        confidence_range = predicted_value * 0.02

        prediction_data.append({
            "time": candle.time,
            "value": predicted_value
        })

        confidence_upper.append({
            "time": candle.time,
            "value": predicted_value + confidence_range
        })

        confidence_lower.append({
            "time": candle.time,
            "value": predicted_value - confidence_range
        })

    return {
        "ml_prediction": {
            "type": "line",
            "data": prediction_data,
            "color": "#ff9800",
            "lineWidth": 2,
            "title": "ML Prediction"
        },
        "confidence_upper": {
            "type": "line",
            "data": confidence_upper,
            "color": "#ff980060",
            "lineWidth": 1,
            "title": "Upper Confidence"
        },
        "confidence_lower": {
            "type": "line",
            "data": confidence_lower,
            "color": "#ff980060",
            "lineWidth": 1,
            "title": "Lower Confidence"
        }
    }


@router.get("/timeframes")
async def get_supported_timeframes():
    """List all supported chart timeframes"""
    return {
        "timeframes": [
            {"value": "1m", "label": "1 Minute"},
            {"value": "5m", "label": "5 Minutes"},
            {"value": "15m", "label": "15 Minutes"},
            {"value": "1h", "label": "1 Hour"},
            {"value": "4h", "label": "4 Hours"},
            {"value": "1d", "label": "1 Day"},
            {"value": "1w", "label": "1 Week"}
        ]
    }
