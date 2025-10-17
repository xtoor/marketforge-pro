"""
Pydantic models for market data responses
Ensures type safety and API contract consistency
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class OHLCVCandle(BaseModel):
    """Single OHLCV candlestick"""
    time: float = Field(..., description="Unix timestamp in seconds")
    open: float
    high: float
    low: float
    close: float
    volume: float


class OHLCVResponse(BaseModel):
    """Response for OHLCV endpoint"""
    exchange: str
    symbol: str
    timeframe: str
    data: List[OHLCVCandle]
    count: int


class TickerResponse(BaseModel):
    """Current ticker data"""
    exchange: str
    symbol: str
    last: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None
    timestamp: Optional[int] = None


class OrderBookResponse(BaseModel):
    """Order book (market depth) data"""
    exchange: str
    symbol: str
    bids: List[List[float]]  # [[price, amount], ...]
    asks: List[List[float]]
    timestamp: Optional[int] = None


class ChartDataResponse(BaseModel):
    """Unified chart data response for TradingView"""
    symbol: str
    timeframe: str
    candles: List[OHLCVCandle]
    indicators: Optional[Dict[str, Any]] = None
    markers: Optional[List[Dict[str, Any]]] = None  # Resonance alerts, signals
    source: str = Field(..., description="Data source (broker name or 'coingecko')")
