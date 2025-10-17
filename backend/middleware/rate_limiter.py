"""
Rate limiting middleware
Prevents API abuse by limiting requests per IP address
"""

import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, status
from fastapi.responses import JSONResponse

# In-memory store: {ip_address: [(timestamp, count), ...]}
rate_limit_store: Dict[str, list] = defaultdict(list)

# Configuration
MAX_REQUESTS = 100  # Max requests per window
WINDOW_SECONDS = 60  # Time window in seconds


async def rate_limiter_middleware(request: Request, call_next):
    """
    Implements token bucket rate limiting per IP address

    Args:
        request: The incoming HTTP request
        call_next: The next middleware/handler in the chain

    Returns:
        Response or 429 Too Many Requests if limit exceeded
    """
    # Skip rate limiting for health checks
    if request.url.path in ["/", "/api/health"]:
        return await call_next(request)

    # Get client IP
    client_ip = request.client.host if request.client else "unknown"

    # Clean old entries
    current_time = time.time()
    cutoff_time = current_time - WINDOW_SECONDS

    if client_ip in rate_limit_store:
        rate_limit_store[client_ip] = [
            ts for ts in rate_limit_store[client_ip]
            if ts > cutoff_time
        ]

    # Check rate limit
    request_count = len(rate_limit_store[client_ip])

    if request_count >= MAX_REQUESTS:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "detail": f"Maximum {MAX_REQUESTS} requests per {WINDOW_SECONDS} seconds",
                "retry_after": WINDOW_SECONDS
            },
            headers={"Retry-After": str(WINDOW_SECONDS)}
        )

    # Add current request
    rate_limit_store[client_ip].append(current_time)

    # Process request
    response = await call_next(request)

    # Add rate limit headers
    remaining = MAX_REQUESTS - request_count - 1
    response.headers["X-RateLimit-Limit"] = str(MAX_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
    response.headers["X-RateLimit-Reset"] = str(int(current_time + WINDOW_SECONDS))

    return response
