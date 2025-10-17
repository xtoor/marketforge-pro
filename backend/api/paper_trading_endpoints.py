"""
Paper Trading API Endpoints

RESTful API for virtual portfolio management
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import httpx

from ..models.paper_trading import (
    Portfolio, PortfolioSummary, Order, Position, Trade,
    CreatePortfolioRequest, CreateOrderRequest, OrderStatus
)
from ..services.paper_trading_service import get_paper_trading_service

router = APIRouter()


# Portfolio Endpoints

@router.post("/portfolios", response_model=Portfolio, status_code=201)
async def create_portfolio(request: CreatePortfolioRequest):
    """Create a new paper trading portfolio"""
    service = get_paper_trading_service()
    return service.create_portfolio(request)


@router.get("/portfolios", response_model=List[PortfolioSummary])
async def list_portfolios():
    """List all portfolios"""
    service = get_paper_trading_service()
    return service.list_portfolios()


@router.get("/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: str):
    """Get portfolio by ID"""
    service = get_paper_trading_service()
    portfolio = service.get_portfolio(portfolio_id)

    if not portfolio:
        raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")

    return portfolio


@router.delete("/portfolios/{portfolio_id}", status_code=204)
async def delete_portfolio(portfolio_id: str):
    """Delete a portfolio"""
    service = get_paper_trading_service()
    success = service.delete_portfolio(portfolio_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")


# Order Endpoints

@router.post("/portfolios/{portfolio_id}/orders", response_model=Order, status_code=201)
async def create_order(portfolio_id: str, request: CreateOrderRequest):
    """
    Create a new order

    The order will be executed immediately if it's a market order,
    or when the price conditions are met for limit/stop orders
    """
    service = get_paper_trading_service()

    # Get current market price
    current_price = await _fetch_current_price(request.symbol)

    if not current_price:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to fetch current price for {request.symbol}"
        )

    try:
        order = service.create_order(portfolio_id, request, current_price)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/portfolios/{portfolio_id}/orders", response_model=List[Order])
async def list_orders(
    portfolio_id: str,
    status: Optional[OrderStatus] = Query(None, description="Filter by order status")
):
    """List orders for a portfolio"""
    service = get_paper_trading_service()
    return service.list_orders(portfolio_id, status)


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order by ID"""
    service = get_paper_trading_service()
    order = service.get_order(order_id)

    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    return order


@router.delete("/orders/{order_id}", response_model=Order)
async def cancel_order(order_id: str):
    """Cancel a pending order"""
    service = get_paper_trading_service()

    try:
        order = service.cancel_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Position Endpoints

@router.get("/portfolios/{portfolio_id}/positions", response_model=List[Position])
async def list_positions(portfolio_id: str):
    """List all positions for a portfolio"""
    service = get_paper_trading_service()

    # Get positions
    positions = service.portfolio_positions.get(portfolio_id, [])

    if not positions:
        return []

    # Fetch current prices for all position symbols
    symbols = set()
    for position_id in positions:
        if position_id in service.positions:
            symbols.add(service.positions[position_id].symbol)

    current_prices = {}
    for symbol in symbols:
        price = await _fetch_current_price(symbol)
        if price:
            current_prices[symbol] = price

    return service.list_positions(portfolio_id, current_prices)


@router.get("/positions/{position_id}", response_model=Position)
async def get_position(position_id: str):
    """Get position by ID"""
    service = get_paper_trading_service()

    if position_id not in service.positions:
        raise HTTPException(status_code=404, detail=f"Position {position_id} not found")

    position_data = service.positions[position_id]
    current_price = await _fetch_current_price(position_data.symbol)

    if not current_price:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to fetch current price for {position_data.symbol}"
        )

    return service.get_position(position_id, current_price)


# Trade History Endpoints

@router.get("/portfolios/{portfolio_id}/trades", response_model=List[Trade])
async def list_trades(
    portfolio_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of trades to return")
):
    """List trade history for a portfolio"""
    service = get_paper_trading_service()
    return service.list_trades(portfolio_id, limit)


# Market Data Helper

async def _fetch_current_price(symbol: str) -> Optional[float]:
    """
    Fetch current market price for a symbol

    Uses CoinGecko API as fallback data source
    In production, this would use the broker API or real-time data feed
    """
    try:
        # Parse symbol (e.g., "BTC/USD" -> "bitcoin")
        coin_id_map = {
            "BTC/USD": "bitcoin",
            "ETH/USD": "ethereum",
            "BNB/USD": "binancecoin",
            "ADA/USD": "cardano",
            "SOL/USD": "solana",
        }

        coin_id = coin_id_map.get(symbol, symbol.split("/")[0].lower())

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": coin_id,
                    "vs_currencies": "usd"
                },
                timeout=5.0
            )

            if response.status_code == 200:
                data = response.json()
                return data.get(coin_id, {}).get("usd")

    except Exception as e:
        print(f"Error fetching price for {symbol}: {e}")

    return None


# Webhook for price updates (background task)

@router.post("/market-update")
async def update_market_prices():
    """
    Update market prices and check for pending order execution

    This endpoint would typically be called by a background scheduler
    or WebSocket price feed
    """
    service = get_paper_trading_service()

    # Get all unique symbols from pending orders
    symbols = set()
    for order in service.orders.values():
        if order.status == OrderStatus.PENDING:
            symbols.add(order.symbol)

    # Fetch current prices
    prices = {}
    for symbol in symbols:
        price = await _fetch_current_price(symbol)
        if price:
            prices[symbol] = price

    # Update and get executed orders
    executed_orders = service.update_market_prices(prices)

    return {
        "updated_symbols": len(prices),
        "executed_orders": len(executed_orders),
        "orders": [order.id for order in executed_orders]
    }
