"""
Paper Trading Service

Handles order execution, position management, and portfolio tracking
"""

from typing import Dict, List, Optional
from datetime import datetime
import uuid
from collections import defaultdict

from ..models.paper_trading import (
    PortfolioData, OrderData, PositionData, TradeData,
    Portfolio, PortfolioSummary, Order, Position, Trade, PortfolioStats,
    CreateOrderRequest, CreatePortfolioRequest,
    OrderSide, OrderType, OrderStatus, PositionSide
)


class PaperTradingService:
    """
    In-memory paper trading system

    Note: In production, this would use a database (SQLite/PostgreSQL)
    For now, using in-memory storage for simplicity
    """

    def __init__(self):
        self.portfolios: Dict[str, PortfolioData] = {}
        self.orders: Dict[str, OrderData] = {}
        self.positions: Dict[str, PositionData] = {}
        self.trades: Dict[str, TradeData] = {}

        # Indexes for efficient queries
        self.portfolio_orders: Dict[str, List[str]] = defaultdict(list)
        self.portfolio_positions: Dict[str, List[str]] = defaultdict(list)
        self.portfolio_trades: Dict[str, List[str]] = defaultdict(list)

        # Fee configuration (0.1% per trade)
        self.fee_rate = 0.001

    # Portfolio Management

    def create_portfolio(self, request: CreatePortfolioRequest) -> Portfolio:
        """Create a new paper trading portfolio"""
        portfolio_id = self._generate_id()
        now = datetime.utcnow()

        portfolio_data = PortfolioData(
            id=portfolio_id,
            name=request.name,
            description=request.description,
            initial_balance=request.initial_balance,
            cash_balance=request.initial_balance,
            created_at=now,
            updated_at=now
        )

        self.portfolios[portfolio_id] = portfolio_data
        return self._build_portfolio_response(portfolio_id)

    def get_portfolio(self, portfolio_id: str) -> Optional[Portfolio]:
        """Get portfolio by ID"""
        if portfolio_id not in self.portfolios:
            return None
        return self._build_portfolio_response(portfolio_id)

    def list_portfolios(self) -> List[PortfolioSummary]:
        """List all portfolios"""
        summaries = []

        for portfolio_id in self.portfolios.keys():
            portfolio = self._build_portfolio_response(portfolio_id)
            summaries.append(PortfolioSummary(
                id=portfolio.id,
                name=portfolio.name,
                current_balance=portfolio.current_balance,
                total_pnl=portfolio.stats.total_pnl,
                total_pnl_percent=portfolio.stats.total_pnl_percent,
                total_trades=portfolio.stats.total_trades,
                created_at=portfolio.created_at
            ))

        return summaries

    def delete_portfolio(self, portfolio_id: str) -> bool:
        """Delete a portfolio and all associated data"""
        if portfolio_id not in self.portfolios:
            return False

        # Delete all associated orders, positions, trades
        for order_id in self.portfolio_orders[portfolio_id]:
            del self.orders[order_id]

        for position_id in self.portfolio_positions[portfolio_id]:
            del self.positions[position_id]

        for trade_id in self.portfolio_trades[portfolio_id]:
            del self.trades[trade_id]

        # Delete indexes
        del self.portfolio_orders[portfolio_id]
        del self.portfolio_positions[portfolio_id]
        del self.portfolio_trades[portfolio_id]

        # Delete portfolio
        del self.portfolios[portfolio_id]
        return True

    # Order Management

    def create_order(
        self,
        portfolio_id: str,
        request: CreateOrderRequest,
        current_price: float
    ) -> Order:
        """
        Create and potentially execute an order

        Args:
            portfolio_id: Portfolio ID
            request: Order request
            current_price: Current market price for the symbol

        Returns:
            Created order
        """
        if portfolio_id not in self.portfolios:
            raise ValueError(f"Portfolio {portfolio_id} not found")

        order_id = self._generate_id()
        now = datetime.utcnow()

        order_data = OrderData(
            id=order_id,
            portfolio_id=portfolio_id,
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            quantity=request.quantity,
            price=request.price,
            stop_price=request.stop_price,
            created_at=now
        )

        self.orders[order_id] = order_data
        self.portfolio_orders[portfolio_id].append(order_id)

        # Execute market orders immediately
        if request.order_type == OrderType.MARKET:
            self._execute_order(order_id, current_price)

        # Execute limit orders if price is favorable
        elif request.order_type == OrderType.LIMIT and request.price:
            if (request.side == OrderSide.BUY and current_price <= request.price) or \
               (request.side == OrderSide.SELL and current_price >= request.price):
                self._execute_order(order_id, request.price)

        return self._build_order_response(order_id)

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        if order_id not in self.orders:
            return None
        return self._build_order_response(order_id)

    def list_orders(self, portfolio_id: str, status: Optional[OrderStatus] = None) -> List[Order]:
        """List orders for a portfolio"""
        order_ids = self.portfolio_orders.get(portfolio_id, [])
        orders = []

        for order_id in order_ids:
            if order_id in self.orders:
                order = self.orders[order_id]
                if status is None or order.status == status:
                    orders.append(self._build_order_response(order_id))

        return sorted(orders, key=lambda x: x.created_at, reverse=True)

    def cancel_order(self, order_id: str) -> Optional[Order]:
        """Cancel a pending order"""
        if order_id not in self.orders:
            return None

        order = self.orders[order_id]

        if order.status != OrderStatus.PENDING:
            raise ValueError(f"Cannot cancel order with status {order.status}")

        order.status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()

        return self._build_order_response(order_id)

    # Position Management

    def get_position(self, position_id: str, current_price: float) -> Optional[Position]:
        """Get position by ID"""
        if position_id not in self.positions:
            return None
        return self._build_position_response(position_id, current_price)

    def list_positions(self, portfolio_id: str, current_prices: Dict[str, float]) -> List[Position]:
        """List all positions for a portfolio"""
        position_ids = self.portfolio_positions.get(portfolio_id, [])
        positions = []

        for position_id in position_ids:
            if position_id in self.positions:
                pos = self.positions[position_id]
                current_price = current_prices.get(pos.symbol, 0)
                positions.append(self._build_position_response(position_id, current_price))

        return positions

    # Trade History

    def list_trades(self, portfolio_id: str, limit: int = 100) -> List[Trade]:
        """List trade history for a portfolio"""
        trade_ids = self.portfolio_trades.get(portfolio_id, [])
        trades = []

        for trade_id in trade_ids:
            if trade_id in self.trades:
                trades.append(self._build_trade_response(trade_id))

        return sorted(trades, key=lambda x: x.executed_at, reverse=True)[:limit]

    # Price Updates (for limit/stop orders)

    def update_market_prices(self, prices: Dict[str, float]) -> List[Order]:
        """
        Update market prices and check for limit/stop order execution

        Args:
            prices: Dict of symbol -> current_price

        Returns:
            List of orders that were executed
        """
        executed_orders = []

        for order_id, order in self.orders.items():
            if order.status != OrderStatus.PENDING:
                continue

            current_price = prices.get(order.symbol)
            if current_price is None:
                continue

            should_execute = False
            execution_price = current_price

            # Check limit orders
            if order.order_type == OrderType.LIMIT and order.price:
                if (order.side == OrderSide.BUY and current_price <= order.price) or \
                   (order.side == OrderSide.SELL and current_price >= order.price):
                    should_execute = True
                    execution_price = order.price

            # Check stop loss orders
            elif order.order_type == OrderType.STOP_LOSS and order.stop_price:
                if current_price <= order.stop_price:
                    should_execute = True
                    execution_price = current_price

            # Check take profit orders
            elif order.order_type == OrderType.TAKE_PROFIT and order.stop_price:
                if current_price >= order.stop_price:
                    should_execute = True
                    execution_price = current_price

            if should_execute:
                self._execute_order(order_id, execution_price)
                executed_orders.append(self._build_order_response(order_id))

        return executed_orders

    # Internal Helper Methods

    def _execute_order(self, order_id: str, execution_price: float) -> None:
        """Execute an order at the given price"""
        order = self.orders[order_id]
        portfolio = self.portfolios[order.portfolio_id]

        # Calculate fee
        fee = execution_price * order.quantity * self.fee_rate
        total_cost = (execution_price * order.quantity) + fee

        # Check if portfolio has sufficient balance
        if order.side == OrderSide.BUY:
            if portfolio.cash_balance < total_cost:
                order.status = OrderStatus.REJECTED
                return

            # Deduct from cash balance
            portfolio.cash_balance -= total_cost

            # Update or create position
            self._update_position(
                portfolio_id=order.portfolio_id,
                symbol=order.symbol,
                side=PositionSide.LONG,
                quantity=order.quantity,
                cost=execution_price * order.quantity
            )

        else:  # SELL
            # Check if there's a position to sell
            position = self._find_position(order.portfolio_id, order.symbol)
            if not position or position.quantity < order.quantity:
                order.status = OrderStatus.REJECTED
                return

            # Add to cash balance
            revenue = (execution_price * order.quantity) - fee
            portfolio.cash_balance += revenue

            # Update position
            self._reduce_position(
                portfolio_id=order.portfolio_id,
                symbol=order.symbol,
                quantity=order.quantity
            )

        # Mark order as filled
        order.status = OrderStatus.FILLED
        order.filled_quantity = order.quantity
        order.average_fill_price = execution_price
        order.filled_at = datetime.utcnow()

        # Record trade
        trade_id = self._generate_id()
        trade_data = TradeData(
            id=trade_id,
            portfolio_id=order.portfolio_id,
            order_id=order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=execution_price,
            fee=fee,
            executed_at=datetime.utcnow()
        )

        self.trades[trade_id] = trade_data
        self.portfolio_trades[order.portfolio_id].append(trade_id)

        # Update portfolio timestamp
        portfolio.updated_at = datetime.utcnow()

    def _update_position(self, portfolio_id: str, symbol: str, side: PositionSide, quantity: float, cost: float) -> None:
        """Update or create a position"""
        position = self._find_position(portfolio_id, symbol)

        if position:
            position.quantity += quantity
            position.total_cost += cost
        else:
            position_id = self._generate_id()
            position_data = PositionData(
                id=position_id,
                portfolio_id=portfolio_id,
                symbol=symbol,
                side=side,
                quantity=quantity,
                total_cost=cost,
                opened_at=datetime.utcnow()
            )
            self.positions[position_id] = position_data
            self.portfolio_positions[portfolio_id].append(position_id)

    def _reduce_position(self, portfolio_id: str, symbol: str, quantity: float) -> None:
        """Reduce position quantity"""
        position = self._find_position(portfolio_id, symbol)

        if position:
            # Calculate proportional cost reduction
            cost_per_unit = position.total_cost / position.quantity
            position.quantity -= quantity
            position.total_cost -= cost_per_unit * quantity

            # Close position if quantity is zero
            if position.quantity <= 0.0001:
                self.portfolio_positions[portfolio_id].remove(position.id)
                del self.positions[position.id]

    def _find_position(self, portfolio_id: str, symbol: str) -> Optional[PositionData]:
        """Find an existing position"""
        position_ids = self.portfolio_positions.get(portfolio_id, [])

        for position_id in position_ids:
            position = self.positions.get(position_id)
            if position and position.symbol == symbol:
                return position

        return None

    def _calculate_portfolio_stats(self, portfolio_id: str, current_prices: Dict[str, float]) -> PortfolioStats:
        """Calculate portfolio statistics"""
        portfolio = self.portfolios[portfolio_id]
        positions = self.list_positions(portfolio_id, current_prices)
        trades = self.list_trades(portfolio_id)

        # Calculate positions value
        positions_value = sum(p.quantity * p.current_price for p in positions)
        total_value = portfolio.cash_balance + positions_value

        # Calculate P&L
        total_pnl = total_value - portfolio.initial_balance
        total_pnl_percent = (total_pnl / portfolio.initial_balance) * 100

        # Trade statistics
        total_trades = len(trades)
        winning_trades = 0
        losing_trades = 0

        # Simple win/loss calculation based on buy/sell pairs
        # (simplified - real implementation would track closed positions)
        buys = [t for t in trades if t.side == OrderSide.BUY]
        sells = [t for t in trades if t.side == OrderSide.SELL]

        for sell in sells:
            matching_buys = [b for b in buys if b.symbol == sell.symbol and b.executed_at < sell.executed_at]
            if matching_buys:
                avg_buy_price = sum(b.price for b in matching_buys) / len(matching_buys)
                if sell.price > avg_buy_price:
                    winning_trades += 1
                else:
                    losing_trades += 1

        win_rate = (winning_trades / (winning_trades + losing_trades) * 100) if (winning_trades + losing_trades) > 0 else 0

        return PortfolioStats(
            total_value=total_value,
            cash_balance=portfolio.cash_balance,
            positions_value=positions_value,
            total_pnl=total_pnl,
            total_pnl_percent=total_pnl_percent,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            sharpe_ratio=None,  # TODO: Calculate Sharpe ratio
            max_drawdown=None  # TODO: Track max drawdown
        )

    # Response Builders

    def _build_portfolio_response(self, portfolio_id: str) -> Portfolio:
        """Build portfolio response with stats"""
        portfolio = self.portfolios[portfolio_id]

        # Get current prices for all positions
        position_symbols = set()
        for position_id in self.portfolio_positions.get(portfolio_id, []):
            if position_id in self.positions:
                position_symbols.add(self.positions[position_id].symbol)

        # For now, use placeholder prices (in real implementation, fetch from market data)
        current_prices = {symbol: 50000.0 for symbol in position_symbols}  # Placeholder

        stats = self._calculate_portfolio_stats(portfolio_id, current_prices)

        return Portfolio(
            id=portfolio.id,
            name=portfolio.name,
            description=portfolio.description,
            initial_balance=portfolio.initial_balance,
            current_balance=portfolio.cash_balance,
            created_at=portfolio.created_at,
            updated_at=portfolio.updated_at,
            stats=stats
        )

    def _build_order_response(self, order_id: str) -> Order:
        """Build order response"""
        order = self.orders[order_id]
        return Order(**order.model_dump())

    def _build_position_response(self, position_id: str, current_price: float) -> Position:
        """Build position response"""
        position = self.positions[position_id]

        unrealized_pnl = (current_price - position.average_entry_price) * position.quantity
        unrealized_pnl_percent = (unrealized_pnl / position.total_cost) * 100 if position.total_cost > 0 else 0

        return Position(
            id=position.id,
            portfolio_id=position.portfolio_id,
            symbol=position.symbol,
            side=position.side,
            quantity=position.quantity,
            average_entry_price=position.average_entry_price,
            current_price=current_price,
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_percent=unrealized_pnl_percent,
            opened_at=position.opened_at
        )

    def _build_trade_response(self, trade_id: str) -> Trade:
        """Build trade response"""
        trade = self.trades[trade_id]
        return Trade(
            id=trade.id,
            portfolio_id=trade.portfolio_id,
            order_id=trade.order_id,
            symbol=trade.symbol,
            side=trade.side,
            quantity=trade.quantity,
            price=trade.price,
            fee=trade.fee,
            total=trade.total,
            executed_at=trade.executed_at
        )

    def _generate_id(self) -> str:
        """Generate unique ID"""
        return str(uuid.uuid4())


# Global service instance
_paper_trading_service: Optional[PaperTradingService] = None


def get_paper_trading_service() -> PaperTradingService:
    """Get or create paper trading service instance"""
    global _paper_trading_service
    if _paper_trading_service is None:
        _paper_trading_service = PaperTradingService()
    return _paper_trading_service
