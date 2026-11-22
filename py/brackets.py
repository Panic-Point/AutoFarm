"""Catches commands written without their brackets, like `harvest` or
`if is_ripe:`.

In Python both are allowed but do nothing useful: a bare `harvest` just names
the command without doing it, and `if is_ripe:` asks "is there a command
called is_ripe?", which is always yes, so Bolt picks crops that aren't ripe.
Young players hit this all the time, so the game stops before the run and
says which brackets to add.
"""

import ast
import re

# What to suggest for a command that needs something inside its brackets.
_EXAMPLES = {
    "move": "move(EAST)",
    "can_move": "can_move(EAST)",
    "plant": "plant(WHEAT)",
    "count": "count(WHEAT)",
    "print": 'print("hello")',
    "ripe_at": "ripe_at(2, 3)",
}

# Places where a yes-or-no question goes.
_TESTS = (ast.If, ast.While, ast.IfExp)
# Places where a value is used, so a command name there is a mistake too.
_VALUES = (ast.BoolOp, ast.UnaryOp, ast.Compare, ast.BinOp)
# Helpers whose arguments must be numbers (`repeat field_size times:`).
_NUMBER_CALLS = {"_times", "_count", "range"}

_DEFINED = re.compile(r"^\s*(?:define|def)\s+([A-Za-z_]\w*)", re.MULTILINE)


def defined_commands(files):
    """Names of commands the player defines in any code window."""
    names = set()
    for code in files.values():
        names.update(_DEFINED.findall(code))
    return names


def example(name):
    return _EXAMPLES.get(name, f"{name}()")


def find_missing(tree, commands):
    """(line, name, kind) for the first command used without brackets, or None.
    kind is 'do' (a statement on its own), 'test' (an if or loop question) or
    'value' (used in a sum, a comparison, `not`, `and`/`or`, or as a number)."""
    # A name the program sets itself is a variable, not the command.
    stored = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)}
    stored |= {a.arg for n in ast.walk(tree) if isinstance(n, ast.arguments)
               for a in n.posonlyargs + n.args + n.kwonlyargs}

    def is_command(node):
        return isinstance(node, ast.Name) and node.id in commands and node.id not in stored

    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and is_command(node.value):
            found.append((node.value, "do"))
        elif isinstance(node, _TESTS) and is_command(node.test):
            found.append((node.test, "test"))
        elif isinstance(node, ast.BoolOp):
            found += [(v, "value") for v in node.values if is_command(v)]
        elif isinstance(node, ast.UnaryOp) and is_command(node.operand):
            found.append((node.operand, "value"))
        elif isinstance(node, ast.Compare):
            found += [(v, "value") for v in [node.left, *node.comparators] if is_command(v)]
        elif isinstance(node, ast.For) and is_command(node.iter):
            found.append((node.iter, "value"))  # `for each crop in order:`
        elif isinstance(node, ast.BinOp):
            found += [(v, "value") for v in (node.left, node.right) if is_command(v)]
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
              and node.func.id in _NUMBER_CALLS):
            found += [(v, "value") for v in node.args if is_command(v)]
    if not found:
        return None
    node, kind = min(found, key=lambda f: (f[0].lineno, f[0].col_offset))
    return node.lineno, node.id, kind


def message(name, kind):
    ex = example(name)
    if kind == "do":
        return f"`{name}` needs brackets to work. Write `{ex}` so Bolt knows to do it."
    if kind == "test":
        return (f"`{name}` needs brackets to check. Write `{ex}`. "
                "Without them Bolt doesn't look, and always thinks the answer is yes!")
    return f"`{name}` needs brackets. Write `{ex}`. Without them Bolt doesn't look, and gets the wrong answer."


_SPACED = re.compile(r"\s*(?P<name>[A-Za-z_]\w*)\s+(?P<rest>[A-Za-z_\"'(\d].*?)\s*(?:#.*)?$")

# Farm commands that work on the tile Bolt stands on, so nothing goes in
# their brackets: `harvest the grass` is `harvest()`.
_EMPTY = {
    "harvest": " Bolt picks whatever it's standing on.",
    "till": " Bolt tills the tile it's standing on.",
    "water": " Bolt waters the tile it's standing on.",
    "wait": "", "refill": "", "is_ripe": "", "is_rotten": "", "is_dry": "", "water_left": "",
    "crop_here": "", "ground_here": "", "position": "", "field_size": "", "ticks": "",
    "order": "", "design": "",
}
_DIRECTIONS = {"NORTH", "SOUTH", "EAST", "WEST", "UP", "DOWN", "LEFT", "RIGHT"}
_CROPS = {"GRASS", "WHEAT", "CARROT", "LETTUCE", "STRAWBERRY", "BLUEBERRY",
          "PUMPKIN", "MUSHROOM", "CORN", "SUNFLOWER"}
# What goes in the brackets of commands that take one word, like `move east`.
_ONE_WORD = {"move": (_DIRECTIONS, "a direction"), "can_move": (_DIRECTIONS, "a direction"),
             "plant": (_CROPS, "a crop"), "count": (_CROPS, "a crop")}
# Little words a player might put before the word that matters: `move to the east`.
_FILLER = {"the", "a", "an", "some", "to", "one", "step", "go"}


def _parses(code):
    try:
        ast.parse(code)
    except SyntaxError:
        return False
    return True


def spaced_hint(line, commands):
    """A hint for `move EAST` (a command and its input with a space instead of
    brackets), or None. Used when the line has a syntax error. The code it
    suggests always works when copied."""
    m = _SPACED.match(line)
    if not m or m["name"] not in commands:
        return None
    name, rest = m["name"], m["rest"].rstrip(":").strip()
    if rest.startswith("(") and rest.endswith(")"):
        return None  # `move (EAST)` is fine; the problem is somewhere else.
    if re.match(r"(?:if|else|and|or|not|in|is)\b", rest):
        return None
    if name in _EMPTY:
        return f"`{name}` needs brackets, with nothing inside. Write `{name}()`.{_EMPTY[name]}"
    if name in _ONE_WORD:
        allowed, what = _ONE_WORD[name]
        words = [w for w in re.split(r"[\s,]+", rest.strip("\"'")) if w.lower() not in _FILLER]
        if len(words) == 1 and words[0].upper() in allowed:
            return f"`{name}` needs brackets around what goes in it. Write `{name}({words[0].upper()})`."
        return f"`{name}` needs brackets with {what} inside. Write `{example(name)}`."
    if _parses(f"{name}({rest})"):
        return f"`{name}` needs brackets around what goes in it. Write `{name}({rest})`."
    return f"`{name}` needs brackets around what goes in it, like `{example(name)}`."
