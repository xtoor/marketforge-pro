#!/usr/bin/env python3
"""
Pine Script Integration Test
Tests the complete workflow: Translation → Execution → Results
"""

import sys
import pandas as pd
import numpy as np
from backend.pine2py.translator import translate
from backend.pine2py.executor import execute_translated_code

# Test Pine Script - SMA Crossover Strategy
pine_script = """
//@version=5
strategy(title="SMA Crossover Test", overlay=true)

fast = input.int(9, title="Fast SMA")
slow = input.int(21, title="Slow SMA")

sma_fast = ta.sma(close, fast)
sma_slow = ta.sma(close, slow)

crossover_signal = ta.crossover(sma_fast, sma_slow)
crossunder_signal = ta.crossunder(sma_fast, sma_slow)

if crossover_signal
    strategy.entry("Long", strategy.long)
if crossunder_signal
    strategy.close("Long")

plot(sma_fast)
plot(sma_slow)
"""

def create_test_data(num_candles=100):
    """Create synthetic OHLCV data for testing"""
    dates = pd.date_range(start='2024-01-01', periods=num_candles, freq='1H')

    # Generate realistic price movement
    np.random.seed(42)
    close_prices = 100 + np.cumsum(np.random.randn(num_candles) * 2)

    df = pd.DataFrame({
        'open': close_prices + np.random.randn(num_candles) * 0.5,
        'high': close_prices + abs(np.random.randn(num_candles)) * 1.5,
        'low': close_prices - abs(np.random.randn(num_candles)) * 1.5,
        'close': close_prices,
        'volume': np.random.randint(1000, 10000, num_candles)
    }, index=dates)

    return df

def main():
    print("=" * 60)
    print("PINE SCRIPT INTEGRATION TEST")
    print("=" * 60)

    # Step 1: Translate Pine Script to Python
    print("\n1. Translating Pine Script to Python...")
    try:
        python_code = translate(pine_script)
        print("   ✓ Translation successful")
        print(f"\n   Generated code (first 500 chars):")
        print("   " + "-" * 50)
        print("   " + python_code[:500].replace("\n", "\n   "))
        print("   ...")
    except Exception as e:
        print(f"   ✗ Translation failed: {e}")
        return 1

    # Step 2: Create test data
    print("\n2. Creating test OHLCV data...")
    try:
        df = create_test_data(200)
        print(f"   ✓ Created {len(df)} candles")
        print(f"   ✓ Date range: {df.index[0]} to {df.index[-1]}")
        print(f"   ✓ Price range: ${df['close'].min():.2f} - ${df['close'].max():.2f}")
    except Exception as e:
        print(f"   ✗ Data creation failed: {e}")
        return 1

    # Step 3: Execute translated strategy
    print("\n3. Executing translated strategy...")
    try:
        result = execute_translated_code(python_code, df)
        print("   ✓ Execution successful")

        # Display results
        print("\n   Results:")
        print(f"   - Orders: {len(result.get('orders', []))}")
        print(f"   - Positions: {len(result.get('positions', []))}")

        # Show sample orders
        orders = result.get('orders', [])
        if orders:
            print("\n   Sample Orders (first 5):")
            for i, order in enumerate(orders[:5]):
                print(f"     {i+1}. {order.get('type', 'N/A')} {order.get('direction', 'N/A')} @ {order.get('price', 0):.2f}")

        # Show indicators
        indicators = result.get('indicators', {})
        if indicators:
            print("\n   Indicators computed:")
            for name, values in indicators.items():
                if isinstance(values, (list, np.ndarray)):
                    print(f"     - {name}: {len(values)} values")

    except Exception as e:
        print(f"   ✗ Execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    print("\n" + "=" * 60)
    print("✓ INTEGRATION TEST PASSED")
    print("=" * 60)
    print("\nThe pine2py library is successfully integrated!")
    print("\nNext steps:")
    print("  1. Start backend: npm run start:backend")
    print("  2. Start frontend: npm run start:frontend")
    print("  3. Access http://localhost:3000")
    print("  4. Enable 'Pine Script Editor' toggle")
    print("  5. Try the examples!")
    print()

    return 0

if __name__ == "__main__":
    sys.exit(main())
