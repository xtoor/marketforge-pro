"""
Global error handling middleware
Provides consistent error responses across the API
"""

import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next):
    """
    Catches and formats all exceptions into consistent JSON responses

    Args:
        request: The incoming HTTP request
        call_next: The next middleware/handler in the chain

    Returns:
        JSONResponse with error details or successful response
    """
    try:
        response = await call_next(request)
        return response
    except RequestValidationError as exc:
        logger.warning(f"Validation error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Validation Error",
                "detail": exc.errors(),
                "path": str(request.url.path)
            }
        )
    except StarletteHTTPException as exc:
        logger.warning(f"HTTP exception: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "path": str(request.url.path)
            }
        )
    except Exception as exc:
        logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "detail": str(exc) if logger.level == logging.DEBUG else "An unexpected error occurred",
                "path": str(request.url.path)
            }
        )
