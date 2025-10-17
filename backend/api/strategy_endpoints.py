"""
Strategy Execution and Backtesting API

Allows users to write custom Python strategies and backtest them
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import httpx
import io
import sys
from contextlib import redirect_stdout, redirect_stderr

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_code: str = Field(..., description="Python strategy code")
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(default="1h", description="Timeframe (1h, 4h, 1d)")
    start_date: str = Field(..., description="Start date (ISO format)")
    end_date: str = Field(..., description="End date (ISO format)")
    initial_balance: float = Field(default=10000.0, gt=0)


class Trade(BaseModel):
    timestamp: int
    side: str
    price: float
    quantity: float
    pnl: float


class BacktestResult(BaseModel):
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_return: float
    total_return_percent: float
    sharpe_ratio: float
    max_drawdown: float
    avg_trade_return: float
    trades: List[Trade]


@router.post("/backtest", response_model=BacktestResult)
async def backtest_strategy(request: BacktestRequest):
    """
    Execute a custom strategy against historical data

    Security Note: This is a simplified implementation for demo purposes.
    In production, you should:
    - Use sandboxed execution (e.g., RestrictedPython, containers)
    - Implement rate limiting
    - Add code validation and sanitization
    - Use a queue system for long-running backtests
    """

    try:
        # Fetch historical data
        data = await _fetch_historical_data(
            request.symbol,
            request.timeframe,
            request.start_date,
            request.end_date
        )

        if data.empty:
            raise HTTPException(
                status_code=400,
                detail="No historical data available for the specified period"
            )

        # Execute strategy in a controlled environment
        signals = _execute_strategy(request.strategy_code, data)

        if not signals:
            return BacktestResult(
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                total_return=0.0,
                total_return_percent=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0,
                avg_trade_return=0.0,
                trades=[]
            )

        # Simulate trades and calculate performance
        result = _simulate_trades(signals, data, request.initial_balance)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Backtest failed: {str(e)}"
        )


async def _fetch_historical_data(
    symbol: str,
    timeframe: str,
    start_date: str,
    end_date: str
) -> pd.DataFrame:
    """
    Fetch historical OHLCV data directly from CoinGecko
    """

    # Normalize symbol format (BTC-USD, BTC/USD, bitcoin -> bitcoin for CoinGecko)
    symbol_map = {
        "btc-usd": "bitcoin",
        "btc/usd": "bitcoin",
        "btc": "bitcoin",
        "eth-usd": "ethereum",
        "eth/usd": "ethereum",
        "eth": "ethereum",
        "bnb-usd": "binancecoin",
        "bnb/usd": "binancecoin",
        "bnb": "binancecoin",
        "ada-usd": "cardano",
        "ada/usd": "cardano",
        "ada": "cardano",
        "sol-usd": "solana",
        "sol/usd": "solana",
        "sol": "solana",
    }

    # Normalize the symbol
    coin_id = symbol_map.get(symbol.lower().replace("_", "-"), symbol.lower())

    try:
        # Calculate days based on date range (or default to 90)
        days = 90
        if start_date and end_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            days = max(1, (end_dt - start_dt).days + 1)

        # CoinGecko OHLC endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc",
                params={
                    "vs_currency": "usd",
                    "days": min(days, 90)  # CoinGecko free API limit
                },
                timeout=30.0
            )

            if response.status_code != 200:
                print(f"CoinGecko API error {response.status_code} for {coin_id}")
                return pd.DataFrame()

            data = response.json()

            if not data or not isinstance(data, list):
                print(f"No OHLC data returned for {coin_id}")
                return pd.DataFrame()

            # Convert to DataFrame
            # CoinGecko OHLC format: [timestamp_ms, open, high, low, close]
            df = pd.DataFrame(data, columns=['timestamp_ms', 'open', 'high', 'low', 'close'])

            # Convert timestamp from milliseconds to seconds
            df['time'] = (df['timestamp_ms'] / 1000).astype(int)
            df = df.drop('timestamp_ms', axis=1)

            # Add volume column (not available in OHLC endpoint, use 0)
            df['volume'] = 0

            # Reorder columns
            df = df[['time', 'open', 'high', 'low', 'close', 'volume']]

            # Filter by date range if specified
            original_count = len(df)
            if start_date:
                start_timestamp = int(datetime.fromisoformat(start_date.replace('Z', '+00:00')).timestamp())
                df = df[df["time"] >= start_timestamp]

            if end_date:
                end_timestamp = int(datetime.fromisoformat(end_date.replace('Z', '+00:00')).timestamp())
                df = df[df["time"] <= end_timestamp]

            # If filtering removed all data, return the unfiltered data
            # This happens when requested dates are outside CoinGecko's 90-day window
            if len(df) == 0 and original_count > 0:
                print(f"⚠ Requested dates outside available range, using all {original_count} candles")
                df = pd.DataFrame(data, columns=['timestamp_ms', 'open', 'high', 'low', 'close'])
                df['time'] = (df['timestamp_ms'] / 1000).astype(int)
                df = df.drop('timestamp_ms', axis=1)
                df['volume'] = 0
                df = df[['time', 'open', 'high', 'low', 'close', 'volume']]

            print(f"Fetched {len(df)} candles for {coin_id}")
            return df

    except Exception as e:
        print(f"Error fetching historical data: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame()


def _execute_strategy(code: str, data: pd.DataFrame) -> List[Dict]:
    """
    Execute user strategy code in a controlled environment

    WARNING: This is a simplified implementation.
    Production should use proper sandboxing!
    """

    # Create a restricted import function
    def safe_import(name, *args, **kwargs):
        """Only allow importing pandas and numpy"""
        allowed_modules = {
            'pandas': pd,
            'numpy': np,
            'np': np,
            'pd': pd
        }
        if name in allowed_modules:
            return allowed_modules[name]
        raise ImportError(f"Import of '{name}' is not allowed in strategy code")

    # Create a restricted globals environment with full builtins
    import builtins
    safe_builtins = {k: getattr(builtins, k) for k in dir(builtins) if not k.startswith('_')}

    # Override dangerous functions
    safe_builtins['__import__'] = safe_import
    safe_builtins['open'] = None  # Disable file operations
    safe_builtins['eval'] = None  # Disable eval
    safe_builtins['exec'] = None  # Disable exec
    safe_builtins['compile'] = None  # Disable compile
    safe_builtins['__loader__'] = None
    safe_builtins['__spec__'] = None

    safe_globals = {
        "pd": pd,
        "np": np,
        "pandas": pd,
        "numpy": np,
        "__builtins__": safe_builtins,
        "__name__": "__main__",
        "__doc__": None,
    }

    # Create a copy of data to prevent modifications
    data_copy = data.copy()

    try:
        # Capture stdout/stderr to prevent information leakage
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            # Execute the strategy code
            exec(code, safe_globals)

            # Call the strategy function
            if "strategy" not in safe_globals:
                raise ValueError("Strategy code must define a 'strategy' function")

            strategy_func = safe_globals["strategy"]
            signals = strategy_func(data_copy)

            if not isinstance(signals, list):
                raise ValueError("Strategy must return a list of signals")

            return signals

    except Exception as e:
        raise ValueError(f"Strategy execution error: {str(e)}")


def _simulate_trades(
    signals: List[Dict],
    data: pd.DataFrame,
    initial_balance: float
) -> BacktestResult:
    """
    Simulate trades based on strategy signals and calculate performance metrics
    """

    balance = initial_balance
    position = 0.0  # Current position size
    position_value = 0.0  # Value when position was opened
    trades = []
    equity_curve = [initial_balance]

    # Create price lookup
    price_map = dict(zip(data["time"], data["close"]))

    for signal in signals:
        timestamp = signal.get("time")
        side = signal.get("side")
        quantity = signal.get("quantity", 1.0)

        # Get price at signal time
        price = price_map.get(timestamp)
        if price is None:
            continue

        pnl = 0.0

        if side == "buy":
            if balance >= price * quantity:
                # Open long position
                cost = price * quantity
                balance -= cost
                position += quantity
                position_value += cost

        elif side == "sell":
            if position >= quantity:
                # Close long position
                revenue = price * quantity
                cost_basis = (position_value / position) * quantity

                pnl = revenue - cost_basis

                balance += revenue
                position -= quantity
                position_value -= cost_basis

                trades.append(Trade(
                    timestamp=timestamp,
                    side=side,
                    price=price,
                    quantity=quantity,
                    pnl=pnl
                ))

        # Track equity
        current_equity = balance + (position * price)
        equity_curve.append(current_equity)

    # Calculate final equity (close any remaining positions at last price)
    final_price = data["close"].iloc[-1]
    if position > 0:
        balance += position * final_price
        position = 0

    final_equity = balance

    # Calculate performance metrics
    total_return = final_equity - initial_balance
    total_return_percent = (total_return / initial_balance) * 100

    winning_trades = sum(1 for t in trades if t.pnl > 0)
    losing_trades = sum(1 for t in trades if t.pnl < 0)
    total_trades = len(trades)

    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    avg_trade_return = total_return / total_trades if total_trades > 0 else 0

    # Calculate Sharpe ratio (simplified)
    if len(equity_curve) > 1:
        returns = pd.Series(equity_curve).pct_change().dropna()
        sharpe_ratio = (returns.mean() / returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
    else:
        sharpe_ratio = 0

    # Calculate max drawdown
    equity_series = pd.Series(equity_curve)
    running_max = equity_series.expanding().max()
    drawdown = (equity_series - running_max) / running_max * 100
    max_drawdown = drawdown.min()

    return BacktestResult(
        total_trades=total_trades,
        winning_trades=winning_trades,
        losing_trades=losing_trades,
        win_rate=win_rate,
        total_return=total_return,
        total_return_percent=total_return_percent,
        sharpe_ratio=sharpe_ratio,
        max_drawdown=max_drawdown,
        avg_trade_return=avg_trade_return,
        trades=trades
    )


@router.get("/strategies")
async def list_saved_strategies():
    """
    List saved strategies

    Note: In production, this would fetch from database
    For now, returns empty list (strategies saved in frontend localStorage)
    """
    return []


@router.post("/strategies")
async def save_strategy(strategy: Dict):
    """
    Save a strategy

    Note: In production, this would save to database
    For now, returns success (strategies saved in frontend localStorage)
    """
    return {"id": "local-" + str(hash(strategy.get("code", ""))), "status": "saved"}


class ExecuteStrategyRequest(BaseModel):
    strategy_code: str = Field(..., description="Python strategy code")
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(default="1h", description="Timeframe")


@router.post("/execute")
async def execute_strategy(request: ExecuteStrategyRequest):
    """
    Execute a strategy on current market data and return buy/sell signals

    This endpoint runs the strategy code and returns signals as markers
    for display on the chart (without backtesting)
    """

    try:
        # Fetch current market data
        data = await _fetch_historical_data(
            request.symbol,
            request.timeframe,
            # Get last 90 days of data
            (datetime.now() - timedelta(days=90)).isoformat() + 'Z',
            datetime.now().isoformat() + 'Z'
        )

        if data.empty:
            raise HTTPException(
                status_code=400,
                detail="No market data available"
            )

        # Execute strategy
        signals = _execute_strategy(request.strategy_code, data)

        if not signals:
            return {"signals": [], "count": 0}

        # Format signals for chart markers
        markers = []
        for signal in signals:
            time_val = signal.get("time")
            side = signal.get("side")

            if time_val and side:
                # Convert pandas Timestamp to Unix timestamp (seconds)
                if hasattr(time_val, 'timestamp'):
                    # pandas Timestamp or datetime object
                    time_unix = int(time_val.timestamp())
                else:
                    # Already a number (int or float)
                    time_unix = int(time_val)

                markers.append({
                    "time": time_unix,
                    "position": "belowBar" if side == "buy" else "aboveBar",
                    "color": "#00ff00" if side == "buy" else "#ff0000",
                    "shape": "arrowUp" if side == "buy" else "arrowDown",
                    "text": side.upper(),
                    "signal_type": side
                })

        return {
            "signals": markers,
            "count": len(markers)
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Strategy execution failed: {str(e)}"
        )
