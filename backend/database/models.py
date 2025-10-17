"""
Database models for MarketForge Pro
SQLAlchemy ORM models for persistent storage
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from .session import Base


class Trade(Base):
    """
    Trade execution record
    Stores all executed trades for paper trading and backtesting
    """
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(String(64), unique=True, index=True, nullable=False)
    symbol = Column(String(32), index=True, nullable=False)
    side = Column(String(16), nullable=False)  # 'buy' or 'sell'
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    strategy_name = Column(String(128), index=True, nullable=True)
    executed_at = Column(DateTime, default=func.now(), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.trade_id,
            "symbol": self.symbol,
            "side": self.side,
            "quantity": self.quantity,
            "price": self.price,
            "total_value": self.total_value,
            "strategy_name": self.strategy_name,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
        }


class Position(Base):
    """
    Current portfolio positions
    Tracks open positions in paper trading account
    """
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(32), unique=True, index=True, nullable=False)
    quantity = Column(Float, nullable=False)
    average_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    opened_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "average_price": self.average_price,
            "current_price": self.current_price,
            "unrealized_pnl": self.unrealized_pnl,
            "realized_pnl": self.realized_pnl,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class StrategyConfig(Base):
    """
    Saved strategy configurations
    Stores user-created Pine Script strategies and ML configurations
    """
    __tablename__ = "strategy_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    strategy_type = Column(String(32), nullable=False)  # 'pinescript', 'ml', 'custom'
    code = Column(Text, nullable=True)  # Pine Script code or Python code
    parameters = Column(JSON, nullable=True)  # Strategy parameters as JSON
    is_active = Column(Boolean, default=False)
    backtest_results = Column(JSON, nullable=True)  # Backtest statistics
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "strategy_type": self.strategy_type,
            "code": self.code,
            "parameters": self.parameters,
            "is_active": self.is_active,
            "backtest_results": self.backtest_results,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Alert(Base):
    """
    Price alerts and strategy signals
    Stores user-configured alerts for price movements and strategy triggers
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(32), nullable=False)  # 'price', 'strategy', 'indicator'
    symbol = Column(String(32), index=True, nullable=False)
    condition = Column(String(64), nullable=False)  # 'above', 'below', 'crossover', etc.
    target_value = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    is_triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    notification_method = Column(String(32), default='desktop')  # 'desktop', 'email', 'webhook'
    webhook_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "symbol": self.symbol,
            "condition": self.condition,
            "target_value": self.target_value,
            "is_active": self.is_active,
            "is_triggered": self.is_triggered,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "notification_method": self.notification_method,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
