"""
Request/response logging middleware
Logs all API requests with timing information
"""

import time
import logging
from fastapi import Request

logger = logging.getLogger(__name__)


async def logging_middleware(request: Request, call_next):
    """
    Logs incoming requests and outgoing responses with timing

    Args:
        request: The incoming HTTP request
        call_next: The next middleware/handler in the chain

    Returns:
        Response with added timing headers
    """
    start_time = time.time()

    # Log request
    logger.info(
        f"→ {request.method} {request.url.path} "
        f"from {request.client.host if request.client else 'unknown'}"
    )

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log response
    logger.info(
        f"← {request.method} {request.url.path} "
        f"status={response.status_code} duration={duration:.3f}s"
    )

    # Add timing header
    response.headers["X-Process-Time"] = str(duration)

    return response
