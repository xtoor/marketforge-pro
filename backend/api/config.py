"""
Configuration management using pydantic-settings
Loads from .env file and environment variables
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Core
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000"

    # Feature Toggles
    ENABLE_BROKERS: bool = False
    ENABLE_RESONANCE: bool = True
    ENABLE_ML_STRATEGIES: bool = True

    # Resonance.ai
    RESONANCE_HOST: str = "http://localhost"
    RESONANCE_PORT: int = 8001
    RESONANCE_API_KEY: Optional[str] = None
    RESONANCE_SCHEMA_VERSION: str = "v13"

    # Broker API Keys (only loaded if ENABLE_BROKERS=true)
    KRAKEN_API_KEY: Optional[str] = None
    KRAKEN_API_SECRET: Optional[str] = None
    COINBASE_API_KEY: Optional[str] = None
    COINBASE_API_SECRET: Optional[str] = None
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_API_SECRET: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_SECRET: Optional[str] = None

    # Fallback Data Sources
    COINGECKO_API_KEY: Optional[str] = None
    ALPHA_VANTAGE_API_KEY: Optional[str] = None

    # TradingView
    TRADINGVIEW_CHART_THEME: str = "dark"
    TRADINGVIEW_LOCALE: str = "en"

    # Performance
    MAX_CHART_CANDLES: int = 5000
    CHART_UPDATE_INTERVAL_MS: int = 1000
    ENABLE_CHART_CACHE: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
