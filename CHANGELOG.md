# Changelog

All notable changes to MarketForge Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Alert Monitoring System** (`server/alertMonitor.ts`)
  - Automatic price and indicator-based alert checking every 10 seconds
  - WebSocket broadcast for triggered alerts
  - Support for multiple condition types (above, below, crosses_above, crosses_below)
- **Error Boundary Component** (`client/src/components/ErrorBoundary.tsx`)
  - React error boundary with graceful error handling
  - Development mode error details display
  - Reset and reload functionality
  - HOC wrapper for functional components
- **Enhanced WebSocket Hook** (`client/src/hooks/useWebSocket.ts`)
  - Automatic reconnection with configurable attempts and intervals
  - Connection status tracking (Connecting, Connected, Disconnected, Error)
  - Callback support for message, error, open, and close events
  - Manual disconnect and reconnect methods
- Python executor utility (`server/pythonExecutor.ts`) for centralized Python subprocess management
- Timeout handling for all Python script executions (default 30 seconds)
- Input validation for API route parameters (symbolId, timeframe, userId)
- Limit validation for market data queries (min: 1, max: 1000)
- NaN checking for drawing viewport filter parameters
- Production-safe error handling (sensitive error details hidden in production mode)
- Proper TypeScript types for indicator data (`IndicatorData` interface)
- Query functions for all React Query hooks (Alerts, Symbols, Indicators)

### Fixed
- **Critical**: Python command inconsistency across platforms (now uses `python3` on Unix, `python` on Windows)
- **Critical**: WebSocket memory leak - market data simulation interval now properly cleaned up on server close
- **Critical**: Missing validation for required route parameters (symbolId, timeframe, userId)
- **Critical**: TypeScript errors in IndicatorPanel.tsx (explicit type for INDICATOR_TYPES)
- **Critical**: TypeScript errors in TradingChartWithIndicators.tsx (added IndicatorData type)
- **Critical**: Missing queryFn in useIndicator hook causing empty object type
- Symbol existence validation before fetching market data or indicators
- Numeric parameter validation with proper bounds checking
- Error message exposure in production environment (sensitive info now logged server-side only)
- Alert component query hooks now have proper queryFn implementations
- Missing drawings methods in MemStorage class

### Changed
- Refactored indicator calculation endpoint to use new Python executor utility
- Improved error responses with conditional debug information based on NODE_ENV
- WebSocket simulation now skips broadcast when no clients connected (performance optimization)
- Market data limit parameter now constrained to 1-1000 range
- App.tsx now wrapped with ErrorBoundary for better error handling
- WebSocket hook significantly improved with reconnection logic and better state management

### Security
- Prevented sensitive error details from being exposed to clients in production
- Added input sanitization for all numeric query parameters
- Improved subprocess timeout handling to prevent hanging processes

## Previous Releases

See [WORKFLOW.md](./WORKFLOW.md) for detailed development history and completed features.
