"""
Pine Script Translation and Execution Endpoints
Integrates pine2py library for TradingView Pine Script translation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np
from datetime import datetime

from ..pine2py.translator import translate
from ..pine2py.executor import execute_translated_code

router = APIRouter()


class PineScriptRequest(BaseModel):
    code: str
    description: Optional[str] = None


class PineScriptExecuteRequest(BaseModel):
    code: str
    symbol: str
    timeframe: str = "1h"
    limit: int = 500


class TranslationResponse(BaseModel):
    success: bool
    python_code: Optional[str] = None
    error: Optional[str] = None


class ExecutionResponse(BaseModel):
    success: bool
    orders: Optional[List[Dict[str, Any]]] = None
    positions: Optional[List[Dict[str, Any]]] = None
    indicators: Optional[Dict[str, List[float]]] = None
    error: Optional[str] = None


@router.post("/translate", response_model=TranslationResponse)
async def translate_pinescript(request: PineScriptRequest):
    """
    Translate Pine Script v5/v6 code to executable Python

    Example Pine Script:
    ```
    //@version=5
    indicator(title="SMA Crossover", overlay=true)
    fast = input.int(9, title="Fast SMA")
    slow = input.int(21, title="Slow SMA")
    sma_fast = ta.sma(close, fast)
    sma_slow = ta.sma(close, slow)
    plot(sma_fast)
    plot(sma_slow)
    ```
    """
    try:
        python_code = translate(request.code)
        return TranslationResponse(
            success=True,
            python_code=python_code
        )
    except Exception as e:
        return TranslationResponse(
            success=False,
            error=str(e)
        )


@router.post("/execute", response_model=ExecutionResponse)
async def execute_pinescript(request: PineScriptExecuteRequest):
    """
    Translate and execute Pine Script strategy against historical data

    Returns:
    - orders: List of strategy entry/exit orders
    - positions: Current positions state
    - indicators: Computed indicator values for plotting
    """
    try:
        # 1. Translate Pine Script to Python
        python_code = translate(request.code)

        # 2. Fetch historical data (integrate with existing chart_data)
        from .chart_data import get_chart_data

        chart_data = await get_chart_data(
            symbol=request.symbol,
            timeframe=request.timeframe,
            source="coingecko",
            include_alerts=False,
            include_ml=False
        )

        # 3. Convert to DataFrame
        df = pd.DataFrame(chart_data["candles"])
        df["datetime"] = pd.to_datetime(df["time"], unit="s")
        df = df.set_index("datetime")

        # Ensure OHLCV columns exist
        required_cols = ["open", "high", "low", "close", "volume"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")

        # 4. Execute translated code
        result = execute_translated_code(python_code, df)

        # 5. Format response
        return ExecutionResponse(
            success=True,
            orders=result.get("orders", []),
            positions=result.get("positions", []),
            indicators=result.get("indicators", {})
        )

    except Exception as e:
        return ExecutionResponse(
            success=False,
            error=str(e)
        )


@router.post("/validate")
async def validate_pinescript(request: PineScriptRequest):
    """
    Validate Pine Script syntax without execution
    """
    try:
        # Attempt translation to check syntax
        translate(request.code)
        return {
            "valid": True,
            "message": "Pine Script is valid"
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "message": "Pine Script contains errors"
        }


@router.get("/examples")
async def get_examples():
    """
    Return example Pine Script strategies and indicators
    """
    examples = [
        {
            "name": "SMA Indicator",
            "type": "indicator",
            "code": """//@version=5
indicator(title="Simple Moving Average", overlay=true)
length = input.int(14, title="Length")
sma_value = ta.sma(close, length)
plot(sma_value, color=color.blue, linewidth=2)
"""
        },
        {
            "name": "RSI Indicator",
            "type": "indicator",
            "code": """//@version=5
indicator(title="RSI", overlay=false)
length = input.int(14, title="RSI Length")
rsi_value = ta.rsi(close, length)
plot(rsi_value)
"""
        },
        {
            "name": "SMA Crossover Strategy",
            "type": "strategy",
            "code": """//@version=5
strategy(title="SMA Crossover", overlay=true)
fast_length = input.int(9, title="Fast SMA")
slow_length = input.int(21, title="Slow SMA")

sma_fast = ta.sma(close, fast_length)
sma_slow = ta.sma(close, slow_length)

crossover = ta.crossover(sma_fast, sma_slow)
crossunder = ta.crossunder(sma_fast, sma_slow)

if crossover
    strategy.entry("Long", strategy.long)
if crossunder
    strategy.close("Long")

plot(sma_fast, color=color.green)
plot(sma_slow, color=color.red)
"""
        },
        {
            "name": "MACD Strategy",
            "type": "strategy",
            "code": """//@version=5
strategy(title="MACD Strategy", overlay=false)
[macd_line, signal_line, hist] = ta.macd(close, 12, 26, 9)

if ta.crossover(macd_line, signal_line)
    strategy.entry("Long", strategy.long)
if ta.crossunder(macd_line, signal_line)
    strategy.close("Long")

plot(macd_line, color=color.blue)
plot(signal_line, color=color.orange)
"""
        }
    ]

    return {"examples": examples}


@router.get("/supported-functions")
async def get_supported_functions():
    """
    List supported Pine Script functions and their mappings
    """
    return {
        "builtins": [
            "close", "open", "high", "low", "volume",
            "time", "bar_index", "na"
        ],
        "indicators": [
            "ta.sma", "ta.ema", "ta.rsi", "ta.macd",
            "ta.crossover", "ta.crossunder"
        ],
        "strategy": [
            "strategy.entry", "strategy.exit", "strategy.close"
        ],
        "plotting": [
            "plot"
        ],
        "input": [
            "input.int", "input.float", "input.bool", "input.string"
        ]
    }
