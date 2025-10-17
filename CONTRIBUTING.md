# Contributing to MarketForge Pro

Thank you for your interest in contributing to MarketForge Pro! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Format](#commit-message-format)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/marketforge-pro.git`
3. Add upstream remote: `git remote add upstream https://github.com/marketforge-pro/marketforge-pro.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- Git

### Installation

```bash
# Run automated setup
bash setup.sh

# Or manual installation
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
npm install
```

### Running in Development Mode

```bash
# Terminal 1 - Backend
source venv/bin/activate
uvicorn backend.api.main:app --reload --port 8000

# Terminal 2 - Frontend
npm run dev
```

## Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Make your changes** in a feature branch

3. **Test your changes**:
   ```bash
   # Backend tests
   pytest backend/tests/

   # Frontend tests
   npm test

   # Linting
   npm run lint
   ```

4. **Commit your changes** with a descriptive commit message (see format below)

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** with:
   - Clear description of the changes
   - Link to related issues
   - Screenshots/GIFs for UI changes
   - Test results

7. **Code Review**: Address any feedback from maintainers

8. **Merge**: Once approved, your PR will be merged

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints for all function parameters and return values
- Write docstrings for all public functions (Google style)
- Maximum line length: 100 characters
- Use `black` for code formatting
- Use `pylint` for linting

Example:
```python
def calculate_returns(prices: list[float], periods: int = 1) -> list[float]:
    """
    Calculate period-over-period returns from price data.

    Args:
        prices: List of historical prices
        periods: Number of periods for return calculation (default: 1)

    Returns:
        List of calculated returns as decimal values

    Raises:
        ValueError: If periods is less than 1 or prices list is empty
    """
    pass
```

### TypeScript/React (Frontend)

- Use TypeScript for all new code
- Follow [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- Use functional components with hooks
- Prefer named exports over default exports
- Use ESLint for linting

Example:
```typescript
interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TradingChart: React.FC<ChartProps> = ({ symbol, timeframe }) => {
  const [data, setData] = useState<ChartData[]>([]);
  // ... component logic
};
```

### General Guidelines

- Write self-documenting code with clear variable names
- Keep functions small and focused (single responsibility)
- Avoid deep nesting (max 3 levels)
- Remove commented-out code before committing
- No hardcoded values - use configuration files
- Handle errors gracefully with proper logging

## Testing Guidelines

### Backend Tests

- Write unit tests for all new functions
- Use `pytest` framework
- Aim for >80% code coverage
- Mock external API calls
- Test edge cases and error conditions

Example:
```python
def test_calculate_returns_valid_input():
    prices = [100, 105, 102, 108]
    expected = [0.05, -0.0286, 0.0588]
    result = calculate_returns(prices)
    assert result == pytest.approx(expected, rel=1e-4)
```

### Frontend Tests

- Write component tests using React Testing Library
- Test user interactions and edge cases
- Snapshot tests for UI components
- Integration tests for critical workflows

Example:
```typescript
import { render, screen } from '@testing-library/react';
import { TradingChart } from './TradingChart';

describe('TradingChart', () => {
  it('renders chart with correct symbol', () => {
    render(<TradingChart symbol="BTC/USD" />);
    expect(screen.getByText(/BTC\/USD/i)).toBeInTheDocument();
  });
});
```

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(chart): add Fibonacci retracement tool

Implement Fibonacci retracement drawing tool with snap-to-price functionality.
Includes keyboard shortcuts for quick access.

Closes #123
```

```
fix(api): handle rate limit errors from CoinGecko API

Add exponential backoff retry logic when encountering 429 errors.
Prevents application crashes during high-frequency requests.

Fixes #456
```

## Areas for Contribution

We welcome contributions in these areas:

### High Priority
- [ ] Additional Pine Script functions
- [ ] More chart indicators
- [ ] Backtesting engine improvements
- [ ] Mobile responsiveness
- [ ] Performance optimizations

### Medium Priority
- [ ] Additional broker integrations
- [ ] Alert notification methods (email, SMS, Discord)
- [ ] Multi-language support
- [ ] Dark/light theme improvements
- [ ] Accessibility (WCAG compliance)

### Documentation
- [ ] API documentation improvements
- [ ] Tutorial videos/guides
- [ ] Example strategies
- [ ] Architecture diagrams

## Questions?

If you have questions or need help:

1. Check existing [Issues](https://github.com/marketforge-pro/marketforge-pro/issues)
2. Search [Discussions](https://github.com/marketforge-pro/marketforge-pro/discussions)
3. Open a new discussion or issue

## License

By contributing to MarketForge Pro, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to MarketForge Pro! 🎉
