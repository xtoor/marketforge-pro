import re
from typing import List

from .parser import parse
from .mapper import replace_builtins, replace_math, replace_logicals, parse_input_call, normalize_literal


def _translate_line(line: str, pine_lineno: int | None = None) -> List[str]:
    code: List[str] = []
    s = line.strip()
    prefix = f"# pine_line:{pine_lineno} " if pine_lineno is not None else ""

    # Inputs: x = input.int(14)
    assign_m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(input\.(?:int|float|bool|string))\s*\((.*)\)\s*$", s)
    if assign_m:
        var = assign_m.group(1)
        func = assign_m.group(2)
        args = assign_m.group(3)
        default = None
        parsed = parse_input_call(s)
        if parsed:
            _, default = parsed
        default = normalize_literal(default) or "None"
        code.append(f"{prefix}{var} = {default}")
        return code

    # strategy.entry/exit/close
    if s.startswith("strategy.entry"):
        # strategy.entry(id, direction, qty)
        m = re.match(r"strategy\.entry\s*\((.*)\)\s*", s)
        if m:
            args = m.group(1)
            code.append(f"{prefix}self.entry({args})")
            return code

    if s.startswith("strategy.exit"):
        m = re.match(r"strategy\.exit\s*\((.*)\)\s*", s)
        if m:
            args = m.group(1)
            code.append(f"{prefix}self.exit({args})")
            return code

    if s.startswith("strategy.close"):
        m = re.match(r"strategy\.close\s*\((.*)\)\s*", s)
        if m:
            args = m.group(1)
            code.append(f"{prefix}self.close({args})")
            return code

    # plot(x)
    if s.startswith("plot("):
        inner = s[s.find("(") + 1 : s.rfind(")")]
        expr = replace_logicals(replace_math(replace_builtins(inner)))
        code.append(f"{prefix}plot({expr})")
        return code

    # Assignments including ta.*
    if re.match(r"^[A-Za-z_][A-Za-z0-9_]*\s*=", s):
        left, right = s.split("=", 1)
        var = left.strip()
        expr = right.strip()

        # crossover/crossunder mapping: boolean arrays
        m_cross = re.match(r"(ta\.)?(crossover|crossunder)\s*\(([^)]*)\)", expr)
        if m_cross:
            func = m_cross.group(2)
            args = [a.strip() for a in m_cross.group(3).split(',')]
            a1 = replace_builtins(args[0])
            a2 = replace_builtins(args[1]) if len(args) > 1 else None
            if a2 is None:
                code.append(f"{prefix}{var} = np.zeros(len(df), dtype=bool)")
            else:
                if func == 'crossover':
                    code.append(f"{prefix}{var} = (({a1}).shift(1) < ({a2}).shift(1)) & (({a1}) >= ({a2}))")
                else:
                    code.append(f"{prefix}{var} = (({a1}).shift(1) > ({a2}).shift(1)) & (({a1}) <= ({a2}))")
            return code

        # ta.macd special: returns 3 series
        if expr.startswith("ta.macd"):
            m = re.match(r"ta\.macd\s*\(([^)]*)\)", expr)
            if m:
                args = [a.strip() for a in m.group(1).split(',')]
                source = replace_builtins(args[0])
                fast = args[1] if len(args) > 1 else "12"
                slow = args[2] if len(args) > 2 else "26"
                signal = args[3] if len(args) > 3 else "9"
                code.append(
                    f"{prefix}{var}_macd, {var}_signal, {var}_hist = talib.MACD(({source}).values, fastperiod=int({fast}), slowperiod=int({slow}), signalperiod=int({signal}))"
                )
                return code

        # common ta.* one-output
        m = re.match(r"ta\.(sma|ema|rsi)\s*\(([^)]*)\)", expr)
        if m:
            func = m.group(1)
            args = [a.strip() for a in m.group(2).split(',')]
            source = replace_builtins(args[0])
            length = args[1] if len(args) > 1 else "14"
            if func == "rsi":
                code.append(f"{prefix}{var} = talib.RSI(({source}).values, timeperiod=int({length}))")
            elif func == "sma":
                code.append(f"{prefix}{var} = talib.SMA(({source}).values, timeperiod=int({length}))")
            elif func == "ema":
                code.append(f"{prefix}{var} = talib.EMA(({source}).values, timeperiod=int({length}))")
            return code

        # generic expression mapping
        expr = replace_logicals(replace_math(replace_builtins(expr)))
        code.append(f"{prefix}{var} = {expr}")
        return code

    # if/else basic pass-through
    if s.startswith("if ") or s == "else" or s.startswith("else "):
        stmt = replace_logicals(replace_math(replace_builtins(s)))
        if stmt.startswith("if ") and not stmt.rstrip().endswith(":"):
            stmt = stmt + ":"
        if stmt.startswith("else") and not stmt.rstrip().endswith(":"):
            stmt = stmt + ":"
        code.append(prefix + stmt)
        return code

    # fallback: expression statement
    code.append(prefix + replace_logicals(replace_math(replace_builtins(s))))
    return code


def translate(pine_code: str) -> str:
    ast = parse(pine_code)
    run_lines: List[str] = []
    for pl in ast.body:
        for py in _translate_line(pl.raw, pl.lineno):
            run_lines.append(py)

    body = "\n        ".join(run_lines) if run_lines else "pass"

    class_name = "TranslatedStrategy"
    code = f"""
# Dependencies (np, pd, talib, Strategy, plot) are provided by executor

class {class_name}(Strategy):
    def __init__(self, df: pd.DataFrame):
        super().__init__(df)

    def run(self):
        df = self.df
        {body}
        return {{
            'orders': self.orders,
            'positions': self.positions,
        }}
""".lstrip()

    return code



