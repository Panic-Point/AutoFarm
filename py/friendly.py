"""Bolt's words for the mistakes young players make most.

Python's own errors (`NameError: name 'Harvest' is not defined`) mean
nothing to a seven year old. Each helper here looks at one kind of mistake
and says what to write instead, in a way that works if the player copies it.
Each returns a message, or None when it can't help and Python's error stays.
"""

import ast
import difflib
import re

from brackets import _EMPTY as _ON_TILE
from brackets import example

# Python words a line can start with, which these hints leave alone.
_KEYWORDS = {
    "if", "elif", "else", "while", "for", "def", "define", "repeat", "return", "give",
    "set", "change", "use", "add", "import", "from", "class", "try", "except", "with",
    "and", "or", "not", "in", "is", "pass", "break", "continue", "True", "False", "None",
}
# Built-in Python commands a player might misspell.
_BUILTINS = ("len", "range", "reversed", "print")

# What goes in each command's brackets, for "`move` needs ... in its brackets".
_NEEDS = {"move": "a direction", "can_move": "a direction", "plant": "a crop", "count": "a crop"}


def _things(n):
    return "one thing" if n == 1 else f"{n} things"


def _commands(api):
    return {k for k, v in api.items() if callable(v) and not isinstance(v, type)}


def _show(name, commands):
    """How to write a name in a suggestion: commands get their brackets."""
    return example(name) if name in commands else name


def name_error(name, api, commands, names=()):
    """For `NameError: name 'x' is not defined`. `commands` are the farm
    commands and the player's own; `names` are the player's other names."""
    commands = _commands(api) | set(commands) | {"print"}
    lower, upper = name.lower(), name.upper()
    if name != lower and lower in commands:
        return f"Bolt doesn't know `{name}`. Bolt's commands are all small letters: `{example(lower)}`."
    if name != upper and isinstance(api.get(upper), str):
        return f"Bolt doesn't know `{name}`. Write it in capital letters: `{upper}`."
    if "is_" + lower in commands:
        return (f"Bolt doesn't know the word `{name}`. To check, Bolt asks `is_{lower}()`, "
                f"like `if is_{lower}():`.")
    # Suggest the closest word. Lowercase directions and crops work too, but
    # the capital ones are what the lessons teach.
    words = {k for k in api if not k[:1] == "_" and k != "Crop" and not (k.islower() and not callable(api[k]))}
    words |= set(commands) | set(names) | set(_BUILTINS)
    words = {w for w in words if w != name and not w.startswith("_")}
    by_lower = {w.lower(): w for w in sorted(words)}
    match = difflib.get_close_matches(lower, list(by_lower), n=1, cutoff=0.7)
    msg = f"Bolt doesn't know the word `{name}`."
    if match:
        return f"{msg} Did you mean `{_show(by_lower[match[0]], commands)}`?"
    return f"{msg} Check the spelling. If it's a name you made up, give it a value before you use it."


_TAKES = re.compile(r"^(?P<f>\w+)\(\) takes (?P<n>\d+) positional arguments? but (?P<m>\d+) (?:was|were) given$")
_MISSING = re.compile(r"^(?P<f>\w+)\(\) missing (?P<n>\d+) required positional arguments?")


def type_error(message):
    """For a player's own command used with the wrong number of things in
    its brackets, like `go(1, 2)` for `define go(steps):`."""
    m = _TAKES.match(message)
    if m:
        n, got = int(m["n"]), int(m["m"])
        if n == 0:
            return f"`{m['f']}` doesn't need anything in its brackets. Write `{m['f']}()`."
        return f"`{m['f']}` needs {_things(n)} in its brackets, but it got {got}."
    m = _MISSING.match(message)
    if m:
        return f"`{m['f']}` needs more in its brackets. Look at its `define` line to see what goes in."
    return None


def _arity(fn):
    """(fewest, most) things a farm command takes, or None if it takes any number."""
    code = getattr(fn, "__code__", None)
    if code is None or code.co_flags & 0x0C:  # *args or **kwargs
        return None
    most = code.co_argcount
    return most - len(fn.__defaults__ or ()), most


def _source(node):
    try:
        return ast.unparse(node)
    except Exception:  # noqa: BLE001
        return None


def _arity_message(name, node, fewest, most):
    given = len(node.args) + len(node.keywords)
    ex = example(name)
    if name == "move" and given > 1:
        first = _source(node.args[0]) if node.args else None
        step = f"move({first})" if first and isinstance(node.args[0], ast.Name) else ex
        steps = node.args[1] if len(node.args) == 2 else None
        if isinstance(steps, ast.Constant) and isinstance(steps.value, int) and steps.value > 1:
            times = "twice" if steps.value == 2 else f"{steps.value} times, each on its own line"
            return f"`move` takes one step at a time. Write `{step}` {times}."
        return f"`move` takes one step at a time, so it only needs a direction. Write `{step}`."
    if most == 0:
        return f"`{name}` doesn't need anything in its brackets. Write `{name}()`.{_ON_TILE.get(name, '')}"
    if given < fewest:
        what = _NEEDS.get(name, _things(fewest))
        return f"`{name}` needs {what} in its brackets. Write `{ex}`."
    if most == 1:
        return f"`{name}` only takes one thing in its brackets. Write `{ex}`."
    return f"`{name}` takes {_things(most)} in its brackets, like `{ex}`."


def stored_names(tree):
    """Names the program sets itself: variables, command inputs and commands."""
    names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)}
    for n in ast.walk(tree):
        if isinstance(n, ast.arguments):
            names |= {a.arg for a in n.posonlyargs + n.args + n.kwonlyargs}
        elif isinstance(n, (ast.FunctionDef, ast.ClassDef)):
            names.add(n.name)
    return names


def wrong_count(tree, api, shadowed):
    """(line, message) for the first farm command with the wrong number of
    things in its brackets, like `move(NORTH, 2)` or `harvest(GRASS)`, or None.
    Names in `shadowed` are the player's own and are left alone."""
    found = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)):
            continue
        name = node.func.id
        if name in shadowed or not callable(api.get(name)) or isinstance(api[name], type):
            continue
        if any(isinstance(a, ast.Starred) for a in node.args) or any(k.arg is None for k in node.keywords):
            continue
        limits = _arity(api[name])
        if limits is None:
            continue
        fewest, most = limits
        if fewest <= len(node.args) + len(node.keywords) <= most:
            continue
        found.append((node.lineno, node.col_offset, _arity_message(name, node, fewest, most)))
    if not found:
        return None
    line, _, msg = min(found)
    return line, msg


_CALL = re.compile(r"[A-Za-z_]\w*\s*\([^()]*\)")
_FIRST = re.compile(r"\s*([A-Za-z_]\w*)")
_WORDS = re.compile(r"\s*[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)+\s*:?\s*")


def syntax_hint(line, commands):
    """A hint for a line Python can't read, like `move(EAST) harvest()` or
    `cut grass`, or None."""
    code = line.split("#", 1)[0].rstrip()
    first = _FIRST.match(code)
    if not first or first[1] in _KEYWORDS:
        return None
    calls = _CALL.findall(code)
    if len(calls) >= 2 and re.search(r"\)\s*[A-Za-z_]", code):
        return f"Put each command on its own line. Write `{calls[0]}` on one line and `{calls[1]}` on the next."
    if _WORDS.fullmatch(code):
        said = " ".join(code.split()).rstrip(":")
        match = difflib.get_close_matches(first[1].lower(), sorted(commands), n=1, cutoff=0.8)
        if match:
            return f"Bolt doesn't know how to `{said}`. Did you mean `{example(match[0])}`?"
        return (f"Bolt doesn't know how to `{said}`. "
                "Bolt's commands have brackets, like `harvest()` or `move(EAST)`.")
    return None
