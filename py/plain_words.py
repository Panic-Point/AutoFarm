"""Plain-word statements that make AutoFarm code read closer to Scratch.

Players can write lines like `repeat 5 times:` instead of
`for i in range(5):`. Before a program runs, `translate()` rewrites each of
these lines into the Python it stands for. Everything else is left alone, so
regular Python keeps working and players can grow into it.

Each line becomes exactly one line, so error line numbers still point at the
player's own code.

    repeat 5 times:              for _ in _times(5):
    for amount times:            for _ in _times(amount):
    repeat forever:              while True:
    repeat until is_ripe():      while not (is_ripe()):
    repeat while move(EAST):     while move(EAST):
    for x from 1 to 10:          for x in _count(1, 10):
    for each item in things:     for item in things:
    else if is_ripe():           elif is_ripe():
    define sweep_row:            def sweep_row():
    define go(steps):            def go(steps):
    set total to 0               total = 0
    change total by 1            total += 1
    use helper                   from helper import *
    use helper, crops            from helper import *; from crops import *
    use go_home from helper      from helper import go_home
"""

import io
import re
import tokenize

_NAME = r"[A-Za-z_]\w*"
# A block opener ends in a colon, optionally followed by more code or a comment.
_TAIL = r"\s*:(?P<tail>.*)$"

# (tag, pattern, replacement builder). Patterns match the line after its indent.
# The tag says which plain-word statement a line was, for py/words.py.
_RULES = [
    ("repeat_forever", re.compile(r"repeat\s+forever" + _TAIL),
     lambda m: "while True:"),
    ("repeat_until", re.compile(r"repeat\s+until\s+(?P<cond>.+?)" + _TAIL),
     lambda m: f"while not ({m['cond']}):"),
    ("repeat_while", re.compile(r"repeat\s+while\s+(?P<cond>.+?)" + _TAIL),
     lambda m: f"while {m['cond']}:"),
    ("repeat_times", re.compile(r"repeat\s+(?P<n>.+?)\s+times?" + _TAIL),
     lambda m: f"for _ in _times({m['n']}):"),
    ("for_each", re.compile(rf"for\s+each\s+(?P<var>{_NAME})\s+in\s+(?P<seq>.+?)" + _TAIL),
     lambda m: f"for {m['var']} in {m['seq']}:"),
    ("count_from", re.compile(rf"for\s+(?P<var>{_NAME})\s+from\s+(?P<a>.+?)\s+to\s+(?P<b>.+?)" + _TAIL),
     lambda m: f"for {m['var']} in _count({m['a']}, {m['b']}):"),
    # `for amount times:` but not regular Python `for x in ...:`.
    ("for_times", re.compile(rf"for\s+(?!{_NAME}\s+in\b)(?P<n>.+?)\s+times?" + _TAIL),
     lambda m: f"for _ in _times({m['n']}):"),
    ("else_if", re.compile(r"else\s+if\s+(?P<cond>.+?)" + _TAIL),
     lambda m: f"elif {m['cond']}:"),
    ("define", re.compile(rf"define\s+(?P<name>{_NAME})\s*(?P<args>\(.*\))?" + _TAIL),
     lambda m: f"def {m['name']}{m['args'] or '()'}:"),
    ("set", re.compile(rf"set\s+(?P<var>{_NAME})\s+to\s+(?P<value>.+)$"),
     lambda m: f"{m['var']} = {m['value']}"),
    ("change", re.compile(rf"change\s+(?P<var>{_NAME})\s+by\s+(?P<value>.+)$"),
     lambda m: f"{m['var']} += {m['value']}"),
    ("use", re.compile(rf"use\s+(?P<names>{_NAME}(?:\s*,\s*{_NAME})*)\s+from\s+(?P<file>{_NAME})\s*(?P<tail>#.*)?$"),
     lambda m: f"from {m['file']} import {_names(m['names'])}"),
    ("use", re.compile(rf"use\s+(?P<files>{_NAME}(?:\s*(?:,|\band\b)\s*{_NAME})*)\s*(?P<tail>#.*)?$"),
     lambda m: "; ".join(f"from {f} import *" for f in _split(m['files']))),
]


def _split(names):
    return [n for n in re.split(r"\s*(?:,|\band\b)\s*", names.strip()) if n]


def _names(names):
    return ", ".join(_split(names))

# Lines that start with one of these words but match no rule get a hint.
_HINTS = {
    "repeat": "Try `repeat 5 times:`, `repeat until is_ripe():`, `repeat while ...:` or `repeat forever:`.",
    "define": "Try `define sweep_row:` or `define go(steps):`.",
    "set": "Try `set total to 0`.",
    "change": "Try `change total by 1`.",
    "use": "Try `use helper` to use the code in your helper window, or `use go_home from helper`.",
}
_FIRST_WORD = re.compile(r"(?P<word>[A-Za-z_]\w*)\b")


class PlainWordsError(Exception):
    def __init__(self, line, message):
        super().__init__(message)
        self.line = line
        self.message = message


def _string_lines(code):
    """Line numbers that sit inside a multi-line string, which we must not touch."""
    inside = set()
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type == tokenize.STRING and tok.start[0] != tok.end[0]:
                inside.update(range(tok.start[0] + 1, tok.end[0] + 1))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        pass  # Python's own parser will report the problem.
    return inside


def _keep_comment(tail):
    """Keep what follows the colon: a comment, or code on the same line."""
    return tail.rstrip() and " " + tail.strip()


def translate(code, tags=None):
    """Rewrite plain-word lines into Python. Raises PlainWordsError for a line
    that starts like a plain-word statement but is not written right.

    If `tags` is a dict, it gets {line number: tag} for every plain-word line."""
    skip = _string_lines(code)
    out = []
    for number, line in enumerate(code.split("\n"), start=1):
        body = line.lstrip()
        if number in skip or not body or body.startswith("#"):
            out.append(line)
            continue
        indent = line[: len(line) - len(body)]
        for tag, pattern, build in _RULES:
            m = pattern.match(body)
            if m:
                if tags is not None:
                    tags[number] = tag
                tail = m.groupdict().get("tail") or ""
                out.append(indent + build(m) + _keep_comment(tail))
                break
        else:
            first = _FIRST_WORD.match(body)
            word = first["word"] if first else ""
            rest = body[len(word):]
            # A plain word used as a statement, not as a variable (`set = 3`).
            if word in _HINTS and rest[:1] in (" ", "\t", ":", "") and not re.match(r"\s*[=.(\[]", rest):
                if word in ("repeat", "define") and not body.rstrip().endswith(":") and "#" not in body:
                    raise PlainWordsError(number, f"Line {number}: add a colon (:) at the end of this line.")
                raise PlainWordsError(number, f"Line {number}: I don't understand this line. {_HINTS[word]}")
            out.append(line)
    return "\n".join(out)


# ---- Helpers the translated code calls ----

def _times(n):
    """range() for `repeat n times`, with a kinder error message."""
    if isinstance(n, bool) or not isinstance(n, (int, float)):
        raise TypeError(f"repeat needs a number of times, but got {n!r}.")
    if n != int(n):
        raise ValueError(f"repeat needs a whole number of times, but got {n}.")
    return range(int(n))


def _count(start, stop):
    """Count from start to stop, including both ends. Counts down if needed."""
    for v in (start, stop):
        if isinstance(v, bool) or not isinstance(v, int):
            raise TypeError(f"from ... to ... needs whole numbers, but got {v!r}.")
    step = 1 if stop >= start else -1
    return range(start, stop + step, step)


HELPERS = {"_times": _times, "_count": _count, "true": True, "false": False}
