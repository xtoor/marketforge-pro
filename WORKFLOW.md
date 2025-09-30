# MarketForge Pro - Trading Platform

## Overview

MarketForge Pro is a comprehensive trading platform that combines real-time market data visualization, automated trading strategies, and advanced technical analysis. The application features a React frontend with TypeScript, an Express.js backend, and PostgreSQL database with Drizzle ORM. It includes Python-based strategy execution and backtesting capabilities, WebSocket real-time data streaming, and a modern UI built with shadcn/ui components.

## Recent Changes

### September 30, 2025
1. **Drawing Tool Buttons**: Fixed non-functional drawing tool buttons (cursor, trendline, horizontal line, fibonacci) by connecting them to the drawing store with proper onClick handlers and active state highlighting.

2. **Strategy Editor Cancel Button**: Added Cancel button to strategy editor allowing users to return to the trading chart without saving changes.

3. **Removed Placeholder Buttons**: Removed non-functional Settings, Alerts, and Profile buttons from the top navbar to reduce clutter and avoid confusion.

4. **Chart Type Switching**: Fixed chart data formatting for Line and Area charts, resolving errors when switching between chart types.

5. **Technical Indicators System**: Complete technical indicators feature with:
   - Indicator store (Zustand) for managing active indicators
   - Add Indicator dialog with 8+ indicator types (SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, ADX)
   - Parameter configuration for each indicator type
   - Real-time API integration with Python backend indicators
   - Backend transformation of Python data to chart-ready format with proper timestamp mapping
   - Chart rendering of all indicators as colored line overlays on main chart
   - Active Indicators panel with visibility toggle and remove controls
   - Fixed React hooks ordering bug using useQueries for dynamic arrays
   - Fixed data transformation to filter nulls, remove NaNs, and sort by time
   - End-to-end tested and fully functional UI

### September 29, 2025

### Completed Features
1. **Database Persistence**: Migrated from in-memory storage to PostgreSQL with DatabaseStorage implementation, proper foreign key constraints, and performance indexes.

2. **Real Market Data Integration**: Integrated CoinGecko API for fetching real OHLCV candlestick data. MarketDataService handles automatic data fetching, rate limiting, and database persistence. Successfully tested with Bitcoin and Ethereum data.

3. **Chart Display Fixes**: Fixed lightweight-charts v5 API compatibility. Charts now use correct `CandlestickSeries` import and proper OHLC data format {time, open, high, low, close}. End-to-end testing confirmed charts render correctly without initialization errors.

4. **Technical Indicators Backend**: Created comprehensive indicators API infrastructure:
   - Python indicators library with 13+ indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, ADX, CCI, Williams %R, OBV, Fibonacci, Pivot Points, Candlestick Patterns)
   - Python calculator wrapper (indicator_calculator.py) for JSON API communication
   - Node.js API endpoint `/api/indicators/:symbolId/:timeframe/:indicatorType` successfully tested (200 response in 19ms)

5. **Custom Chart Context Menu**: Implemented 100% custom right-click context menu system (no TradingView UI dependencies):
   - ChartContextMenu component with glassmorphism styling
   - Right-click on chart opens context menu at cursor position
   - Add Indicator dialog with 8+ indicator types
   - Add Alert dialog for price-based alerts
   - Drawing tool options (Trend Line, Horizontal Line, Fibonacci Retracement)
   - Chart Settings option for customization
   - End-to-end tested and fully functional

6. **Drawing Tools Complete**: Fully functional drawing tools with erase functionality:
   - Drawing store (Zustand) for state management
   - Chart click handler integration with lightweight-charts v5 API
   - **Horizontal Lines**: Fully functional with createPriceLine() rendering (cyan)
   - **Trend Lines**: Two-click system with LineSeries rendering (green diagonal lines)
   - **Fibonacci Retracement**: Two-click system with 7 levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
   - **Erase Tools**: "Clear All Drawings" option in context menu removes all drawings
   - End-to-end tested and fully functional

7. **Drawing Persistence System**: Complete database persistence for chart drawings:
   - PostgreSQL drawings table with JSONB columns for points, style, and bounding box
   - Full CRUD API endpoints with proper validation using Zod schemas
   - useDrawings React hook with TanStack Query for data fetching and mutations
   - Auto-load drawings on page refresh with proper symbol/timeframe filtering
   - Clear all drawings persists cleared state across page refreshes
   - Viewport-based filtering support for performance optimization (bbox with numeric comparison)
   - Guards to prevent saving with invalid userId/symbolId
   - End-to-end tested: drawings save, persist across refresh, and clear correctly

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: Zustand for global trading state management (symbols, timeframes, chart types)
- **Data Fetching**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Lightweight Charts library for financial data visualization
- **Real-time Updates**: Custom WebSocket hook for live market data streaming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **API Design**: RESTful endpoints with WebSocket support for real-time features
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Comprehensive trading data model including users, symbols, market data, orders, positions, alerts, and strategies
- **Real-time Communication**: WebSocket server for live market data streaming and trade updates
- **Python Integration**: Child process spawning for executing Python trading strategies and backtesting

### Database Schema Design
- **Users**: Authentication and user management
- **Symbols**: Trading instruments (crypto, stocks, forex, commodities)
- **Market Data**: OHLCV candlestick data with multiple timeframes
- **Watchlists**: User-specific symbol tracking
- **Orders**: Trade orders with various types (market, limit, stop)
- **Positions**: Open trading positions with P&L tracking
- **Alerts**: Price and indicator-based notifications
- **Strategies**: Custom trading algorithms
- **Backtests**: Historical strategy performance analysis

### Python Strategy Engine
- **Technical Indicators**: Comprehensive library including SMA, EMA, RSI, MACD, and more
- **Backtesting Framework**: Advanced backtesting engine with trade simulation and performance metrics
- **Strategy Execution**: Safe execution environment for user-defined trading strategies
- **Risk Management**: Built-in position sizing and risk controls

### Styling and Design System
- **Design Language**: Custom dark theme with neon accents and glassmorphism effects
- **Color Scheme**: Dark blue background with cyan primary colors and semantic color coding for trading data
- **Typography**: Inter font for UI elements and JetBrains Mono for financial data display
- **Components**: Consistent design patterns using CSS variables and Tailwind utility classes

### Development and Build System
- **Development**: Hot module replacement with Vite for fast development cycles
- **Build Process**: Separate client and server builds with ESBuild for server-side compilation
- **Type Safety**: Shared TypeScript types between client and server
- **Database Migrations**: Drizzle Kit for schema management and migrations

## External Dependencies

### Database and Storage
- **Neon Database**: PostgreSQL database hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management

### Real-time Data
- **WebSocket Protocol**: Native WebSocket implementation for real-time market data streaming
- **Market Data APIs**: Integration points for external financial data providers

### UI and Visualization
- **Radix UI**: Accessible component primitives for dialog, dropdown, and form components
- **Lightweight Charts**: Professional financial charting library for candlestick and indicator visualization
- **Tailwind CSS**: Utility-first CSS framework for styling

### Development Tools
- **Replit Integration**: Development environment plugins for runtime error handling and debugging
- **TypeScript**: Type checking and enhanced developer experience
- **ESLint/Prettier**: Code formatting and linting (implicit from setup)

### Python Runtime
- **Technical Analysis Libraries**: NumPy and Pandas for numerical computations
- **Strategy Execution**: Isolated Python environment for user strategy execution
