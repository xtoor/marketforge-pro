"""
Resonance.ai Scanner v13 Integration Bridge
Provides modular, schema-isolated access to breakout alerts and signals

Architecture:
- Submodule at backend/resonance/ (git submodule)
- HTTP client for serve_detections.py endpoints
- Fixed schema validation to detect breaking changes
- Graceful degradation if service unavailable
"""

import aiohttp
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, ValidationError

from ..api.config import settings


class ResonanceAlert(BaseModel):
    """
    Fixed schema for Resonance.ai v13 alerts
    Any deviation raises ValidationError, preventing silent breakage
    """
    time: int  # Unix timestamp
    symbol: str
    signal: str  # "breakout", "breakdown", "support", "resistance"
    confidence: float  # 0.0 - 1.0
    price: Optional[float] = None
    volume: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class ResonanceBridge:
    """
    Bridge to Resonance.ai Scanner v13 HTTP API

    Usage:
        bridge = ResonanceBridge()
        await bridge.connect()
        alerts = await bridge.get_alerts(symbol="BTC/USD")
    """

    def __init__(self):
        self.base_url = f"{settings.RESONANCE_HOST}:{settings.RESONANCE_PORT}"
        self.api_key = settings.RESONANCE_API_KEY
        self.schema_version = settings.RESONANCE_SCHEMA_VERSION
        self.session: Optional[aiohttp.ClientSession] = None
        self._cache: Dict[str, List[ResonanceAlert]] = {}
        self._cache_ttl = 60  # seconds

    async def connect(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession(
            headers={
                "X-API-Key": self.api_key or "",
                "X-Schema-Version": self.schema_version
            }
        )

    async def disconnect(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()

    async def health_check(self) -> str:
        """
        Check if Resonance service is reachable

        Returns:
            "healthy" or error message
        """
        try:
            async with self.session.get(f"{self.base_url}/health", timeout=5) as response:
                if response.status == 200:
                    return "healthy"
                return f"unhealthy (status {response.status})"
        except aiohttp.ClientError as e:
            return f"unreachable: {str(e)}"
        except Exception as e:
            return f"error: {str(e)}"

    async def get_alerts(
        self,
        symbol: Optional[str] = None,
        timeframe: Optional[str] = None,
        since: Optional[int] = None,
        limit: int = 100
    ) -> List[ResonanceAlert]:
        """
        Fetch breakout/breakdown alerts from Resonance.ai

        Args:
            symbol: Filter by trading pair (e.g., "BTC/USD")
            timeframe: Chart timeframe (e.g., "1h", "4h", "1d") - helps align alerts with candles
            since: Unix timestamp - only return alerts after this time
            limit: Max number of alerts to return

        Returns:
            List of validated ResonanceAlert objects

        Raises:
            ValidationError: If response schema doesn't match expected v13 format
            aiohttp.ClientError: If service is unreachable
        """

        # Check cache
        cache_key = f"{symbol}:{timeframe}:{since}:{limit}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        if not self.session:
            raise RuntimeError("Bridge not connected. Call connect() first.")

        params = {"limit": limit}
        if symbol:
            params["symbol"] = symbol
        if timeframe:
            params["timeframe"] = timeframe
        if since:
            params["since"] = since

        try:
            async with self.session.get(
                f"{self.base_url}/api/alerts",
                params=params,
                timeout=10
            ) as response:
                if response.status != 200:
                    raise aiohttp.ClientError(
                        f"Resonance API returned {response.status}"
                    )

                data = await response.json()

                # Validate schema
                alerts = [ResonanceAlert(**alert) for alert in data.get("alerts", [])]

                # Cache results
                self._cache[cache_key] = alerts
                asyncio.create_task(self._expire_cache(cache_key))

                return alerts

        except ValidationError as e:
            # Schema mismatch - critical error
            raise RuntimeError(
                f"Resonance.ai schema changed! Expected v13 format. "
                f"Run 'git submodule update' and check for breaking changes. "
                f"Error: {e}"
            )

    async def get_scanner_status(self) -> Dict[str, Any]:
        """
        Get current scanner status and metrics

        Returns:
            Dictionary with scanner state, active symbols, etc.
        """
        if not self.session:
            raise RuntimeError("Bridge not connected")

        async with self.session.get(
            f"{self.base_url}/status",
            timeout=5
        ) as response:
            if response.status == 200:
                return await response.json()
            return {"status": "error", "code": response.status}

    async def _expire_cache(self, key: str):
        """Remove cache entry after TTL expires"""
        await asyncio.sleep(self._cache_ttl)
        self._cache.pop(key, None)


# Dependency injection helper for FastAPI
_resonance_instance: Optional[ResonanceBridge] = None


def get_resonance_bridge() -> Optional[ResonanceBridge]:
    """
    Get singleton ResonanceBridge instance

    Usage in FastAPI:
        @app.get("/endpoint")
        async def handler(resonance: ResonanceBridge = Depends(get_resonance_bridge)):
            alerts = await resonance.get_alerts()
    """
    global _resonance_instance
    return _resonance_instance


def set_resonance_instance(instance: ResonanceBridge):
    """Set the global Resonance bridge instance (called from app lifespan)"""
    global _resonance_instance
    _resonance_instance = instance
