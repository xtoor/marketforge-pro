"""
Paper Trading Models

Data models for virtual portfolio management and order simulation
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"


class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class PositionSide(str, Enum):
    LONG = "long"
    SHORT = "short"


# Request Models
class CreateOrderRequest(BaseModel):
    """Request to create a new paper trading order"""
    symbol: str = Field(..., description="Trading pair symbol (e.g., BTC/USD)")
    side: OrderSide = Field(..., description="Buy or sell")
    order_type: OrderType = Field(..., description="Market, limit, stop, etc.")
    quantity: float = Field(..., gt=0, description="Amount to trade")
    price: Optional[float] = Field(None, gt=0, description="Limit price (required for limit orders)")
    stop_price: Optional[float] = Field(None, gt=0, description="Stop trigger price")

    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "limit",
                "quantity": 0.5,
                "price": 50000.0
            }
        }


class CreatePortfolioRequest(BaseModel):
    """Request to create a new paper trading portfolio"""
    name: str = Field(..., min_length=1, max_length=100, description="Portfolio name")
    initial_balance: float = Field(100000.0, gt=0, description="Starting balance in USD")
    description: Optional[str] = Field(None, max_length=500)


# Response Models
class Order(BaseModel):
    """Paper trading order"""
    id: str
    portfolio_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    filled_quantity: float
    price: Optional[float]
    stop_price: Optional[float]
    average_fill_price: Optional[float]
    status: OrderStatus
    created_at: datetime
    filled_at: Optional[datetime]
    cancelled_at: Optional[datetime]


class Position(BaseModel):
    """Active trading position"""
    id: str
    portfolio_id: str
    symbol: str
    side: PositionSide
    quantity: float
    average_entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    opened_at: datetime


class Trade(BaseModel):
    """Executed trade (filled order)"""
    id: str
    portfolio_id: str
    order_id: str
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    fee: float
    total: float
    executed_at: datetime


class PortfolioStats(BaseModel):
    """Portfolio performance statistics"""
    total_value: float
    cash_balance: float
    positions_value: float
    total_pnl: float
    total_pnl_percent: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]


class Portfolio(BaseModel):
    """Paper trading portfolio"""
    id: str
    name: str
    description: Optional[str]
    initial_balance: float
    current_balance: float
    created_at: datetime
    updated_at: datetime
    stats: PortfolioStats


class PortfolioSummary(BaseModel):
    """Lightweight portfolio summary"""
    id: str
    name: str
    current_balance: float
    total_pnl: float
    total_pnl_percent: float
    total_trades: int
    created_at: datetime


# In-memory storage models (will be replaced with database in production)
class PortfolioData(BaseModel):
    """Internal portfolio data structure"""
    id: str
    name: str
    description: Optional[str] = None
    initial_balance: float
    cash_balance: float
    created_at: datetime
    updated_at: datetime


class OrderData(BaseModel):
    """Internal order data structure"""
    id: str
    portfolio_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    filled_quantity: float = 0
    price: Optional[float] = None
    stop_price: Optional[float] = None
    average_fill_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime
    filled_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class PositionData(BaseModel):
    """Internal position data structure"""
    id: str
    portfolio_id: str
    symbol: str
    side: PositionSide
    quantity: float
    total_cost: float  # Used to calculate average entry price
    opened_at: datetime

    @property
    def average_entry_price(self) -> float:
        return self.total_cost / self.quantity if self.quantity > 0 else 0


class TradeData(BaseModel):
    """Internal trade data structure"""
    id: str
    portfolio_id: str
    order_id: str
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    fee: float
    executed_at: datetime

    @property
    def total(self) -> float:
        return (self.quantity * self.price) + self.fee
