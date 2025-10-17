"""
Tests for Paper Trading API
"""

import pytest
from fastapi.testclient import TestClient
from ..api.main import app

client = TestClient(app)


class TestPaperTradingPortfolios:
    """Test portfolio management endpoints"""

    def test_create_portfolio(self):
        """Test creating a new portfolio"""
        response = client.post(
            "/api/paper-trading/portfolios",
            json={
                "name": "Test Portfolio",
                "initial_balance": 50000.0,
                "description": "Test portfolio for unit tests"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Portfolio"
        assert data["initial_balance"] == 50000.0
        assert data["current_balance"] == 50000.0
        assert "id" in data
        assert "stats" in data

    def test_list_portfolios(self):
        """Test listing all portfolios"""
        # Create a portfolio first
        client.post(
            "/api/paper-trading/portfolios",
            json={"name": "List Test", "initial_balance": 10000}
        )

        response = client.get("/api/paper-trading/portfolios")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_portfolio(self):
        """Test getting a specific portfolio"""
        # Create portfolio
        create_response = client.post(
            "/api/paper-trading/portfolios",
            json={"name": "Get Test", "initial_balance": 10000}
        )
        portfolio_id = create_response.json()["id"]

        # Get portfolio
        response = client.get(f"/api/paper-trading/portfolios/{portfolio_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == portfolio_id
        assert data["name"] == "Get Test"

    def test_get_nonexistent_portfolio(self):
        """Test getting a portfolio that doesn't exist"""
        response = client.get("/api/paper-trading/portfolios/nonexistent")
        assert response.status_code == 404


class TestPaperTradingOrders:
    """Test order management endpoints"""

    @pytest.fixture
    def portfolio_id(self):
        """Create a test portfolio and return its ID"""
        response = client.post(
            "/api/paper-trading/portfolios",
            json={"name": "Order Test Portfolio", "initial_balance": 100000}
        )
        return response.json()["id"]

    def test_create_market_buy_order(self, portfolio_id):
        """Test creating a market buy order"""
        response = client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "market",
                "quantity": 0.1
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["symbol"] == "BTC/USD"
        assert data["side"] == "buy"
        assert data["order_type"] == "market"
        assert data["quantity"] == 0.1
        assert data["status"] in ["filled", "pending"]

    def test_create_limit_order(self, portfolio_id):
        """Test creating a limit order"""
        response = client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "limit",
                "quantity": 0.5,
                "price": 30000.0
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["order_type"] == "limit"
        assert data["price"] == 30000.0

    def test_list_orders(self, portfolio_id):
        """Test listing orders for a portfolio"""
        # Create an order first
        client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "market",
                "quantity": 0.1
            }
        )

        response = client.get(f"/api/paper-trading/portfolios/{portfolio_id}/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_cancel_order(self, portfolio_id):
        """Test cancelling a pending order"""
        # Create a limit order (will be pending)
        create_response = client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "limit",
                "quantity": 0.1,
                "price": 1000.0  # Very low price, won't fill
            }
        )
        order_id = create_response.json()["id"]

        # Cancel the order
        response = client.delete(f"/api/paper-trading/orders/{order_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"


class TestPaperTradingPositions:
    """Test position management endpoints"""

    @pytest.fixture
    def portfolio_with_position(self):
        """Create a portfolio and open a position"""
        # Create portfolio
        portfolio_response = client.post(
            "/api/paper-trading/portfolios",
            json={"name": "Position Test", "initial_balance": 100000}
        )
        portfolio_id = portfolio_response.json()["id"]

        # Create buy order to open position
        client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "market",
                "quantity": 1.0
            }
        )

        return portfolio_id

    def test_list_positions(self, portfolio_with_position):
        """Test listing positions"""
        response = client.get(
            f"/api/paper-trading/portfolios/{portfolio_with_position}/positions"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPaperTradingTrades:
    """Test trade history endpoints"""

    @pytest.fixture
    def portfolio_with_trades(self):
        """Create a portfolio with executed trades"""
        portfolio_response = client.post(
            "/api/paper-trading/portfolios",
            json={"name": "Trade Test", "initial_balance": 100000}
        )
        portfolio_id = portfolio_response.json()["id"]

        # Execute a market order (will create a trade)
        client.post(
            f"/api/paper-trading/portfolios/{portfolio_id}/orders",
            json={
                "symbol": "BTC/USD",
                "side": "buy",
                "order_type": "market",
                "quantity": 0.5
            }
        )

        return portfolio_id

    def test_list_trades(self, portfolio_with_trades):
        """Test listing trade history"""
        response = client.get(
            f"/api/paper-trading/portfolios/{portfolio_with_trades}/trades"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


def test_paper_trading_full_flow():
    """Test complete paper trading flow"""
    # 1. Create portfolio
    portfolio_response = client.post(
        "/api/paper-trading/portfolios",
        json={"name": "Full Flow Test", "initial_balance": 100000}
    )
    assert portfolio_response.status_code == 201
    portfolio_id = portfolio_response.json()["id"]
    initial_balance = portfolio_response.json()["current_balance"]

    # 2. Place buy order
    buy_response = client.post(
        f"/api/paper-trading/portfolios/{portfolio_id}/orders",
        json={
            "symbol": "BTC/USD",
            "side": "buy",
            "order_type": "market",
            "quantity": 0.5
        }
    )
    assert buy_response.status_code == 201

    # 3. Check portfolio balance decreased
    portfolio_response = client.get(f"/api/paper-trading/portfolios/{portfolio_id}")
    current_balance = portfolio_response.json()["current_balance"]
    assert current_balance < initial_balance

    # 4. Check positions
    positions_response = client.get(
        f"/api/paper-trading/portfolios/{portfolio_id}/positions"
    )
    assert positions_response.status_code == 200

    # 5. Check trades
    trades_response = client.get(
        f"/api/paper-trading/portfolios/{portfolio_id}/trades"
    )
    assert trades_response.status_code == 200
    trades = trades_response.json()
    assert len(trades) > 0
