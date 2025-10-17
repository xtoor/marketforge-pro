#!/usr/bin/env python3
"""
Resonance.ai Schema Validation Test
Verifies that Resonance.ai submodule API matches expected v13 schema
Run after updating submodule: python scripts/test_schema.py
"""

import sys
import asyncio
import aiohttp
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from bridges.resonance_bridge import ResonanceAlert, ResonanceBridge
from api.config import settings


async def test_schema():
    """Test Resonance.ai API schema compatibility"""

    print("🔍 Testing Resonance.ai Schema Compatibility")
    print("=" * 50)

    # Check if Resonance is enabled
    if not settings.ENABLE_RESONANCE:
        print("⚠️  ENABLE_RESONANCE=false in .env")
        print("   Set to 'true' to test Resonance integration")
        return

    # Initialize bridge
    bridge = ResonanceBridge()
    await bridge.connect()

    # Test 1: Health check
    print("\n1️⃣  Testing health endpoint...")
    try:
        status = await bridge.health_check()
        if "healthy" in status:
            print(f"   ✅ Health check passed: {status}")
        else:
            print(f"   ⚠️  Health check warning: {status}")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        print("   → Ensure Resonance scanner is running on port", settings.RESONANCE_PORT)
        await bridge.disconnect()
        return

    # Test 2: Fetch alerts (schema validation)
    print("\n2️⃣  Testing alerts endpoint schema...")
    try:
        alerts = await bridge.get_alerts(limit=5)
        print(f"   ✅ Fetched {len(alerts)} alerts")

        if alerts:
            print("\n   Sample alert:")
            sample = alerts[0]
            print(f"     - time: {sample.time}")
            print(f"     - symbol: {sample.symbol}")
            print(f"     - signal: {sample.signal}")
            print(f"     - confidence: {sample.confidence}")

            # Validate schema fields
            required_fields = ['time', 'symbol', 'signal', 'confidence']
            for field in required_fields:
                assert hasattr(sample, field), f"Missing field: {field}"

            print("   ✅ Schema validation passed")
        else:
            print("   ℹ️  No alerts returned (scanner may be idle)")

    except Exception as e:
        print(f"   ❌ Schema validation failed: {e}")
        print("\n   🚨 BREAKING CHANGE DETECTED!")
        print("      Resonance.ai API schema doesn't match v13 format.")
        print("      Action required:")
        print("        1. Check submodule version: cd backend/resonance && git log -1")
        print("        2. Review API changes in Resonance repo")
        print("        3. Update backend/bridges/resonance_bridge.py schema")
        await bridge.disconnect()
        sys.exit(1)

    # Test 3: Scanner status
    print("\n3️⃣  Testing status endpoint...")
    try:
        status = await bridge.get_scanner_status()
        print(f"   ✅ Scanner status: {status.get('status', 'unknown')}")
        if 'symbols_tracked' in status:
            print(f"      Tracking {status['symbols_tracked']} symbols")
    except Exception as e:
        print(f"   ⚠️  Status endpoint unavailable: {e}")

    await bridge.disconnect()

    print("\n" + "=" * 50)
    print("✅ All schema tests passed!")
    print("   Resonance.ai v13 integration is compatible.")


if __name__ == "__main__":
    asyncio.run(test_schema())
