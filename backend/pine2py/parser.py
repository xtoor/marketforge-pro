import re
from dataclasses import dataclass
from typing import List, Optional

try:
    # Optional PLY-based parser; falls back to regex parser if unavailable
    from .ply_parser import parse_ply  # type: ignore
except Exception:  # pragma: no cover
    parse_ply = None  # type: ignore


@dataclass
class PineLine:
    raw: str
    lineno: int


@dataclass
class PineScript:
    version: Optional[int]
    is_strategy: bool
    header: List[PineLine]
    body: List[PineLine]


VERSION_RE = re.compile(r"^\s*//\s*@version\s*=\s*(\d+)")
DECL_RE = re.compile(r"^\s*(indicator|strategy)\s*\((.*)\)\s*$")


def parse(pine_code: str) -> PineScript:
    # Prefer PLY parser if available
    if parse_ply is not None:
        try:
            ast = parse_ply(pine_code)
            if ast is not None:
                return ast
        except Exception:
            # Fall back to lightweight parser
            pass
    lines = pine_code.splitlines()
    header: List[PineLine] = []
    body: List[PineLine] = []
    version: Optional[int] = None
    is_strategy = False

    for idx, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if not stripped:
            continue
        vm = VERSION_RE.match(raw)
        if vm:
            version = int(vm.group(1))
            header.append(PineLine(raw=raw, lineno=idx))
            continue
        dm = DECL_RE.match(raw)
        if dm:
            is_strategy = dm.group(1) == "strategy"
            header.append(PineLine(raw=raw, lineno=idx))
            continue
        # skip comment-only lines
        if stripped.startswith("//"):
            continue
        body.append(PineLine(raw=raw, lineno=idx))

    return PineScript(version=version, is_strategy=is_strategy, header=header, body=body)



