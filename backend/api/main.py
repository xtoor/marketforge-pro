"""
MarketForge-Pro Backend API
Main FastAPI application with modular broker endpoints and Resonance.ai integration

Copyright 2025 MarketForge Pro Team
Licensed under the Apache License, Version 2.0
"""

import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from .config import settings
from .broker_endpoints import router as broker_router
from .chart_data import router as chart_router
from .paper_trading_endpoints import router as paper_trading_router
from .strategy_endpoints import router as strategy_router
from .news_endpoints import router as news_router
from .pinescript_endpoints import router as pinescript_router
from ..bridges.resonance_bridge import ResonanceBridge, set_resonance_instance
from ..bridges.tradingview_bridge import TradingViewBridge
from ..middleware.error_handler import error_handler_middleware
from ..middleware.logging_middleware import logging_middleware
from ..middleware.rate_limiter import rate_limiter_middleware
from ..database import init_db

load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize services on startup, cleanup on shutdown

    Lifecycle:
        1. Initialize database tables
        2. Connect to Resonance.ai (if enabled)
        3. Initialize TradingView bridge
        4. Yield control to application
        5. Cleanup on shutdown
    """
    logger.info("Starting MarketForge-Pro Backend API")

    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    # Initialize bridges
    if settings.ENABLE_RESONANCE:
        try:
            app.state.resonance = ResonanceBridge()
            await app.state.resonance.connect()
            set_resonance_instance(app.state.resonance)
            logger.info("Resonance.ai bridge connected")
        except Exception as e:
            logger.warning(f"Failed to connect to Resonance.ai: {e}")

    app.state.tradingview = TradingViewBridge()
    logger.info("TradingView bridge initialized")

    yield

    # Cleanup
    logger.info("Shutting down MarketForge-Pro Backend API")
    if hasattr(app.state, 'resonance'):
        await app.state.resonance.disconnect()
        set_resonance_instance(None)
        logger.info("Resonance.ai bridge disconnected")


app = FastAPI(
    title="MarketForge-Pro API",
    description="Advanced financial visualization platform with TradingView integration, Pine Script execution, and multi-broker support",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add custom middleware (order matters - applied in reverse)
app.middleware("http")(error_handler_middleware)
app.middleware("http")(logging_middleware)
app.middleware("http")(rate_limiter_middleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chart_router, prefix="/api/chart", tags=["chart"])
app.include_router(paper_trading_router, prefix="/api/paper-trading", tags=["paper-trading"])
app.include_router(strategy_router, prefix="/api/strategy", tags=["strategy"])
app.include_router(news_router, prefix="/api/news", tags=["news"])
app.include_router(pinescript_router, prefix="/api/pinescript", tags=["pinescript"])

# Conditionally include broker endpoints
if settings.ENABLE_BROKERS:
    app.include_router(broker_router, prefix="/api/broker", tags=["broker"])


@app.get("/", tags=["System"])
async def root():
    """
    API root endpoint
    Returns basic information about the API and enabled features
    """
    return {
        "name": "MarketForge-Pro API",
        "version": "1.0.0",
        "description": "Advanced financial visualization platform",
        "documentation": "/docs",
        "features": {
            "brokers_enabled": settings.ENABLE_BROKERS,
            "resonance_enabled": settings.ENABLE_RESONANCE,
            "ml_strategies_enabled": settings.ENABLE_ML_STRATEGIES
        },
        "endpoints": {
            "chart_data": "/api/chart",
            "paper_trading": "/api/paper-trading",
            "strategies": "/api/strategy",
            "pinescript": "/api/pinescript",
            "news": "/api/news",
            "broker": "/api/broker" if settings.ENABLE_BROKERS else None
        }
    }


@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Health check endpoint with detailed service status

    Returns:
        dict: Status of all system components including:
            - API health
            - Database connection
            - TradingView bridge
            - Resonance.ai connection (if enabled)

    Example response:
        {
            "api": "healthy",
            "database": "connected",
            "tradingview_bridge": "active",
            "resonance": "connected"
        }
    """
    from ..database import engine

    health_status = {
        "api": "healthy",
        "database": "unknown",
        "tradingview_bridge": "active"
    }

    # Check database connection
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["database"] = f"error: {str(e)}"

    # Check Resonance.ai
    if settings.ENABLE_RESONANCE and hasattr(app.state, 'resonance'):
        try:
            resonance_status = await app.state.resonance.health_check()
            health_status["resonance"] = resonance_status
        except Exception as e:
            health_status["resonance"] = f"error: {str(e)}"

    return health_status
