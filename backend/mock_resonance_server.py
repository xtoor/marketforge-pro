"""
Mock Resonance.ai Scanner Server
Generates realistic alert data for testing
Run with: python mock_resonance_server.py
"""

from fastapi import FastAPI
from typing import List
import random
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="Mock Resonance.ai Scanner")


def generate_mock_alerts(symbol: str, count: int = 5, timeframe: str = "1h") -> List[dict]:
    """
    Generate realistic mock alerts for testing

    Alerts are distributed across the appropriate historical time range
    based on the timeframe to match chart data
    """
    alerts = []
    signal_types = ["breakout", "breakdown", "support", "resistance"]

    # Calculate time range based on timeframe to match CoinGecko data
    timeframe_to_days = {
        "1m": 1,
        "5m": 1,
        "15m": 1,
        "1h": 7,
        "4h": 30,
        "1d": 365
    }
    days_range = timeframe_to_days.get(timeframe, 7)

    # Generate alerts distributed across the historical range
    base_time = datetime.now()

    for i in range(count):
        # Random time within the historical range
        hours_ago = random.randint(1, days_range * 24)
        alert_time = base_time - timedelta(hours=hours_ago)

        signal = random.choice(signal_types)
        confidence = random.uniform(0.65, 0.99)

        alerts.append({
            "time": int(alert_time.timestamp()),
            "symbol": symbol,
            "signal": signal,
            "confidence": confidence,
            "price": random.uniform(40000, 120000) if "btc" in symbol.lower() else random.uniform(2000, 5000),
            "volume": random.uniform(1000000, 5000000),
            "metadata": {
                "pattern": random.choice(["triangle", "flag", "head_shoulders", "double_bottom"]),
                "timeframe": timeframe
            }
        })

    # Sort by time
    alerts.sort(key=lambda x: x["time"])

    return alerts


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Mock Resonance.ai Scanner v13",
        "version": "13.0.0-mock"
    }


@app.get("/api/alerts")
async def get_alerts(
    symbol: str = "bitcoin",
    timeframe: str = "1h",
    limit: int = 10
):
    """
    Get mock alerts for a symbol

    Returns data in Resonance.ai v13 schema format
    """
    alerts = generate_mock_alerts(symbol, min(limit, 20), timeframe)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(alerts),
        "alerts": alerts,
        "generated_at": datetime.now().isoformat(),
        "is_mock": True
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Mock Resonance.ai Scanner",
        "version": "13.0.0-mock",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "alerts": "/api/alerts?symbol=bitcoin&timeframe=1h&limit=10"
        }
    }


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Mock Resonance.ai Scanner Server")
    print("=" * 60)
    print("URL: http://localhost:8001")
    print("Health: http://localhost:8001/health")
    print("Alerts: http://localhost:8001/api/alerts?symbol=bitcoin")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
