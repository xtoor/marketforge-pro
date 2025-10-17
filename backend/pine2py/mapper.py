import re

# Built-in series and variables mapping
BUILTIN_SERIES = {
    "open": "df['open']",
    "high": "df['high']",
    "low": "df['low']",
    "close": "df['close']",
    "volume": "df['volume']",
}

BUILTIN_SPECIAL = {
    "bar_index": "df.index",
    "time": "df.index",
    "na": "np.nan",
    "strategy.position_size": "self.position_size()",
}

# Strategy direction constants
CONSTANTS = {
    "strategy.long": "'long'",
    "strategy.short": "'short'",
}

# TA indicator function mapping
INDICATOR_MAP = {
    "ta.sma": "_map_ta_sma",
    "ta.ema": "_map_ta_ema",
    "ta.rsi": "_map_ta_rsi",
    "ta.macd": "_map_ta_macd",
}

MATH_MAP = {
    "math.sum": "_map_math_sum",
    "math.avg": "_map_math_avg",
}

CROSS_MAP = {
    "ta.crossover": "_map_crossover",
    "ta.crossunder": "_map_crossunder",
    "crossover": "_map_crossover",
    "crossunder": "_map_crossunder",
}

INPUT_FUNCS = {
    "input.int": int,
    "input.float": float,
    "input.bool": lambda x: bool(int(x)) if isinstance(x, str) and x.isdigit() else bool(x),
    "input.string": str,
}


def replace_builtins(expr: str) -> str:
    # Replace simple series names first
    for name, repl in BUILTIN_SERIES.items():
        expr = re.sub(rf"(?<![\w\.]){name}(?![\w])", repl, expr)
    # Replace specials
    for name, repl in BUILTIN_SPECIAL.items():
        expr = re.sub(rf"(?<![\w\.]){name}(?![\w])", repl, expr)
    # Replace constants
    for name, repl in CONSTANTS.items():
        expr = re.sub(rf"(?<![\w\.]){re.escape(name)}(?![\w])", repl, expr)
    return expr


def replace_math(expr: str) -> str:
    expr = expr.replace("math.sqrt", "np.sqrt")
    expr = expr.replace("math.pow", "np.power")
    expr = expr.replace("math.floor", "np.floor")
    expr = expr.replace("math.ceil", "np.ceil")
    expr = expr.replace("math.abs", "np.abs")
    expr = expr.replace("abs(", "np.abs(")
    return expr


def replace_logicals(expr: str) -> str:
    # Convert Pine booleans to Python
    expr = re.sub(r"(?<![\w\.])true(?![\w])", "True", expr, flags=re.IGNORECASE)
    expr = re.sub(r"(?<![\w\.])false(?![\w])", "False", expr, flags=re.IGNORECASE)
    return expr


def is_assignment(line: str) -> bool:
    return bool(re.match(r"^[A-Za-z_][A-Za-z0-9_]*\s*=\s*", line))


def parse_input_call(line: str):
    m = re.search(r"(input\.(?:int|float|bool|string))\s*\(([^)]*)\)", line)
    if not m:
        return None
    func = m.group(1)
    args = m.group(2)
    # naive default extraction: look for last positional literal
    default = None
    if args.strip():
        # support default=...
        mdef = re.search(r"default\s*=\s*([^,]+)", args)
        if mdef:
            default = mdef.group(1).strip()
        else:
            parts = [p.strip() for p in args.split(',') if p.strip()]
            if parts:
                default = parts[0]
    return func, default


def normalize_literal(value: str):
    if value is None:
        return None
    v = value.strip()
    if v.lower() in ("true", "false"):
        return "True" if v.lower() == "true" else "False"
    return v



