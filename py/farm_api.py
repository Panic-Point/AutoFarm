"""The commands a player's program can use, and the runner that executes it.

Loaded once into Pyodide inside the worker. `_farm` is a JavaScript module the
worker registers; it owns the farm simulation (js/game.js). Action functions
return 1 (did something), 0 (could not), or -1 (out of ticks for this run).
"""

import ast
import builtins
import sys
import traceback

import _farm

NORTH = "north"
SOUTH = "south"
EAST = "east"
WEST = "west"
_DIRECTIONS = (NORTH, SOUTH, EAST, WEST)


class Crop:
    GRASS = "grass"
    WHEAT = "wheat"
    CARROT = "carrot"


_CROPS = (Crop.GRASS, Crop.WHEAT, Crop.CARROT)
_ITEMS = ("hay", "wheat", "carrot")

# Safety limits so a runaway program cannot freeze the game.
LINE_LIMIT = 300_000


class OutOfTicks(BaseException):
    """The run used every tick it was given. Not an Exception subclass, so a
    player's `except Exception:` cannot swallow it."""


class TooManySteps(BaseException):
    """The program ran too many lines without the farmer doing anything."""


def _act(result):
    if result < 0:
        raise OutOfTicks()
    return result == 1


# ---- Actions: each takes one tick ----

def move(direction):
    """Step one tile NORTH, SOUTH, EAST or WEST. Returns False at the edge."""
    if direction not in _DIRECTIONS:
        raise ValueError("move() needs NORTH, SOUTH, EAST or WEST, got " + repr(direction))
    return _act(_farm.move(direction))


def till():
    """Turn grass into soil, or soil back into grass."""
    return _act(_farm.till())


def plant(crop):
    """Plant a crop on this tile. Returns False if it cannot be planted here."""
    if crop not in _CROPS:
        raise ValueError("plant() needs Crop.GRASS, Crop.WHEAT or Crop.CARROT, got " + repr(crop))
    return _act(_farm.plant(crop))


def harvest():
    """Harvest this tile. Returns True if the crop was ripe and collected."""
    return _act(_farm.harvest())


def wait():
    """Do nothing for one tick."""
    return _act(_farm.wait())


# ---- Sensing: free ----

def is_ripe():
    """True if this tile has a crop that is ready to harvest."""
    return bool(_farm.is_ripe())


def crop_here():
    """The crop on this tile (for example Crop.WHEAT), or None."""
    c = _farm.crop_here()
    return c if c else None


def ground_here():
    """'grass' or 'soil'."""
    return _farm.ground_here()


def position():
    """Your (x, y) position. (0, 0) is the south-west corner."""
    return (_farm.pos_x(), _farm.pos_y())


def field_size():
    """How many tiles wide (and tall) the field is."""
    return _farm.field_size()


def count(item):
    """How many of an item you have: 'hay', 'wheat' or 'carrot'."""
    if item not in _ITEMS:
        raise ValueError("count() needs 'hay', 'wheat' or 'carrot', got " + repr(item))
    return _farm.count(item)


def ticks():
    """Ticks used so far in this run."""
    return _farm.ticks()


def _print(*args, sep=" ", end=""):
    _farm.log(sep.join(str(a) for a in args) + end)


API = {
    "move": move, "till": till, "plant": plant, "harvest": harvest, "wait": wait,
    "is_ripe": is_ripe, "crop_here": crop_here, "ground_here": ground_here,
    "position": position, "field_size": field_size, "count": count, "ticks": ticks,
    "NORTH": NORTH, "SOUTH": SOUTH, "EAST": EAST, "WEST": WEST, "Crop": Crop,
    "print": _print,
}

USER_FILE = "<farm>"
_lines = 0


def _local_trace(frame, event, arg):
    global _lines
    if event == "line":
        _lines += 1
        if _lines > LINE_LIMIT:
            raise TooManySteps()
    return _local_trace


def _global_trace(frame, event, arg):
    # Only count lines in the player's own code.
    if frame.f_code.co_filename == USER_FILE:
        return _local_trace
    return None


def _user_line(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == USER_FILE]
    return frames[-1].lineno if frames else None


# Sandbox: player programs get plain Python (loops, functions, classes, lists,
# dicts...) but no imports, no dunder access and no file or eval builtins.
_BLOCKED_BUILTINS = {
    "__import__", "open", "eval", "exec", "compile", "input", "breakpoint",
    "globals", "locals", "vars", "getattr", "setattr", "delattr", "help", "exit", "quit",
}
_SAFE_BUILTINS = {k: v for k, v in builtins.__dict__.items()
                  if k not in _BLOCKED_BUILTINS and not k.startswith("_")}
_SAFE_BUILTINS["__build_class__"] = builtins.__build_class__  # allow `class`


def _check_sandbox(tree):
    """Return an error message for code the sandbox does not allow, or None."""
    for node in ast.walk(tree):
        line = getattr(node, "lineno", None)
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return f"Line {line}: import is not available in AutoFarm programs."
        name = None
        if isinstance(node, ast.Attribute):
            name = node.attr
        elif isinstance(node, ast.Name):
            name = node.id
        if name and name.startswith("__") and name.endswith("__"):
            return f"Line {line}: names like {name} are not available in AutoFarm programs."
    return None


def run(code):
    """Run a player's program. Returns [status, message] where status is
    'ok', 'out_of_ticks', 'too_many_steps' or 'error'."""
    global _lines
    _lines = 0
    try:
        tree = ast.parse(code, USER_FILE)
    except SyntaxError as e:
        return ["error", f"Line {e.lineno}: SyntaxError: {e.msg}"]
    problem = _check_sandbox(tree)
    if problem:
        return ["error", problem]
    compiled = compile(tree, USER_FILE, "exec")

    env = {"__name__": "__main__", "__builtins__": _SAFE_BUILTINS}
    env.update(API)
    sys.settrace(_global_trace)
    try:
        exec(compiled, env)
    except OutOfTicks:
        return ["out_of_ticks", "The farmer ran out of ticks for this run."]
    except TooManySteps as e:
        line = _user_line(e)
        where = f" (around line {line})" if line else ""
        return ["too_many_steps",
                f"Your program ran {LINE_LIMIT:,} lines without finishing{where}. "
                "Is there a loop that never ends without the farmer doing anything?"]
    except BaseException as e:  # noqa: BLE001 - report every player error
        line = _user_line(e)
        msg = f"{type(e).__name__}: {e}"
        return ["error", f"Line {line}: {msg}" if line else msg]
    finally:
        sys.settrace(None)
    return ["ok", "Program finished."]
