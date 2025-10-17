"""
Optional broker API endpoints (Kraken, Coinbase, Binance, Gemini)
Only active when ENABLE_BROKERS=true in .env
Uses ccxt library for unified exchange interface
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import asyncio

# Conditional imports - only load if brokers are enabled
try:
    import ccxt
    import ccxt.async_support as ccxt_async
    CCXT_AVAILABLE = True
except ImportError:
    CCXT_AVAILABLE = False

from .config import settings
from ..models.market_data import OHLCVResponse, TickerResponse, OrderBookResponse

router = APIRouter()


class BrokerManager:
    """Manages connections to multiple cryptocurrency exchanges"""

    def __init__(self):
        if not CCXT_AVAILABLE:
            raise RuntimeError("ccxt library not installed. Install with: pip install ccxt")

        self.exchanges = {}
        self._initialize_exchanges()

    def _initialize_exchanges(self):
        """Initialize exchange instances with API credentials"""

        # Kraken
        if settings.KRAKEN_API_KEY and settings.KRAKEN_API_SECRET:
            self.exchanges['kraken'] = ccxt_async.kraken({
                'apiKey': settings.KRAKEN_API_KEY,
                'secret': settings.KRAKEN_API_SECRET,
                'enableRateLimit': True,
            })

        # Coinbase
        if settings.COINBASE_API_KEY and settings.COINBASE_API_SECRET:
            self.exchanges['coinbase'] = ccxt_async.coinbase({
                'apiKey': settings.COINBASE_API_KEY,
                'secret': settings.COINBASE_API_SECRET,
                'enableRateLimit': True,
            })

        # Binance
        if settings.BINANCE_API_KEY and settings.BINANCE_API_SECRET:
            self.exchanges['binance'] = ccxt_async.binance({
                'apiKey': settings.BINANCE_API_KEY,
                'secret': settings.BINANCE_API_SECRET,
                'enableRateLimit': True,
            })

        # Gemini
        if settings.GEMINI_API_KEY and settings.GEMINI_API_SECRET:
            self.exchanges['gemini'] = ccxt_async.gemini({
                'apiKey': settings.GEMINI_API_KEY,
                'secret': settings.GEMINI_API_SECRET,
                'enableRateLimit': True,
            })

    def get_exchange(self, exchange_name: str):
        """Get exchange instance by name"""
        if exchange_name not in self.exchanges:
            raise HTTPException(
                status_code=404,
                detail=f"Exchange '{exchange_name}' not configured. Check API keys in .env"
            )
        return self.exchanges[exchange_name]

    async def close_all(self):
        """Close all exchange connections"""
        for exchange in self.exchanges.values():
            await exchange.close()


# Global broker manager instance
_broker_manager: Optional[BrokerManager] = None


def get_broker_manager() -> BrokerManager:
    """Dependency to get broker manager instance"""
    global _broker_manager
    if _broker_manager is None:
        _broker_manager = BrokerManager()
    return _broker_manager


@router.get("/{exchange}/ohlcv/{symbol}")
async def get_ohlcv(
    exchange: str,
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe (e.g., 1m, 5m, 1h, 1d)"),
    limit: int = Query(500, ge=1, le=5000),
    since: Optional[int] = Query(None, description="Unix timestamp in milliseconds"),
    broker_manager: BrokerManager = Depends(get_broker_manager)
) -> OHLCVResponse:
    """
    Fetch OHLCV (candlestick) data from specified exchange

    Args:
        exchange: Exchange name (kraken, coinbase, binance, gemini)
        symbol: Trading pair (e.g., BTC/USD, ETH/USDT)
        timeframe: Candlestick timeframe
        limit: Number of candles to fetch
        since: Start time in milliseconds

    Returns:
        OHLCV data compatible with TradingView lightweight-charts format
    """
    # if not settings.ENABLE_BROKERS:
    #     raise HTTPException(
    #         status_code=403,
    #         detail="Broker endpoints disabled. Set ENABLE_BROKERS=true in .env"
    #     )

    try:
        broker_manager = get_broker_manager()
        exchange_instance = broker_manager.get_exchange(exchange.lower())

        # Fetch OHLCV data
        ohlcv = await exchange_instance.fetch_ohlcv(
            symbol=symbol,
            timeframe=timeframe,
            since=since,
            limit=limit
        )

        # Transform to TradingView format: [timestamp, open, high, low, close, volume]
        formatted_data = [
            {
                "time": candle[0] / 1000,  # Convert to seconds
                "open": candle[1],
                "high": candle[2],
                "low": candle[3],
                "close": candle[4],
                "volume": candle[5]
            }
            for candle in ohlcv
        ]

        return OHLCVResponse(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            data=formatted_data,
            count=len(formatted_data)
        )

    except ccxt.NetworkError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except ccxt.ExchangeError as e:
        raise HTTPException(status_code=400, detail=f"Exchange error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/{exchange}/ticker/{symbol}")
async def get_ticker(
    exchange: str,
    symbol: str,
    broker_manager: BrokerManager = Depends(get_broker_manager)
) -> TickerResponse:
    """
    Fetch current ticker (price) data

    Args:
        exchange: Exchange name
        symbol: Trading pair

    Returns:
        Current price, volume, bid/ask data
    """
    # if not settings.ENABLE_BROKERS:
    #     raise HTTPException(status_code=403, detail="Broker endpoints disabled")

    try:
        broker_manager = get_broker_manager()
        exchange_instance = broker_manager.get_exchange(exchange.lower())
        ticker = await exchange_instance.fetch_ticker(symbol)

        return TickerResponse(
            exchange=exchange,
            symbol=symbol,
            last=ticker.get('last'),
            bid=ticker.get('bid'),
            ask=ticker.get('ask'),
            high=ticker.get('high'),
            low=ticker.get('low'),
            volume=ticker.get('baseVolume'),
            timestamp=ticker.get('timestamp')
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exchange}/markets")
async def get_markets(
    exchange: str,
    broker_manager: BrokerManager = Depends(get_broker_manager)
) -> Dict[str, Any]:
    """
    List all available trading pairs on exchange

    Returns:
        Dictionary of market symbols and metadata
    """
    # if not settings.ENABLE_BROKERS:
    #     raise HTTPException(status_code=403, detail="Broker endpoints disabled")

    try:
        broker_manager = get_broker_manager()
        exchange_instance = broker_manager.get_exchange(exchange.lower())
        await exchange_instance.load_markets()

        return {
            "exchange": exchange,
            "markets": list(exchange_instance.markets.keys()),
            "count": len(exchange_instance.markets)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Commented out advanced features - uncomment as needed
# @router.get("/{exchange}/orderbook/{symbol}")
# async def get_orderbook(
#     exchange: str,
#     symbol: str,
#     limit: int = Query(100, ge=1, le=1000),
#     broker_manager: BrokerManager = Depends(get_broker_manager)
# ) -> OrderBookResponse:
#     """Fetch order book (market depth) data"""
#     broker_manager = get_broker_manager()
#     exchange_instance = broker_manager.get_exchange(exchange.lower())
#     orderbook = await exchange_instance.fetch_order_book(symbol, limit)
#
#     return OrderBookResponse(
#         exchange=exchange,
#         symbol=symbol,
#         bids=orderbook['bids'][:limit],
#         asks=orderbook['asks'][:limit],
#         timestamp=orderbook.get('timestamp')
#     )
