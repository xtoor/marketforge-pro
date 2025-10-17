"""
PLY-based Pine Script parser scaffold.

This module provides an optional parse_ply(code) function used by parser.parse().
For now, it returns None to allow graceful fallback to the lightweight parser.
Later, implement a full Pine grammar with lex/yacc rules and build a proper AST
with line numbers.
"""
from __future__ import annotations

from typing import Optional


def parse_ply(pine_code: str):  # pragma: no cover - scaffold
    # Returning None triggers fallback to the lightweight parser.
    return None


