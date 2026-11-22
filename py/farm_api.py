"""The commands a player's program can use, and the runner that executes it.

Loaded once into Pyodide inside the worker. `_farm` is a JavaScript module the
worker registers; it owns the farm simulation (js/game.js). Action functions
return 1 (did something), 0 (could not), or -1 (out of ticks for this run).
"""

import ast
import builtins
import json
import sys
import traceback
import types

import _farm
from brackets import defined_commands, find_missing, spaced_hint
from brackets import message as brackets_message
from friendly import name_error, stored_names, syntax_hint, type_error, wrong_count
from plain_words import HELPERS, PlainWordsError, translate
from words import API_WORDS, find_words

NORTH = "north"
SOUTH = "south"
EAST = "east"
WEST = "west"
_DIRECTIONS = (NORTH, SOUTH, EAST, WEST)
# Another way to say each direction. North is the top of the field, so
# UP is NORTH and RIGHT is EAST. They are the same strings as the compass names.
UP = NORTH
DOWN = SOUTH
LEFT = WEST
RIGHT = EAST
_DIRECTION_NAMES = "NORTH, SOUTH, EAST or WEST (or UP, DOWN, LEFT or RIGHT)"


class Crop:
    """Every crop. Players write the names on their own (WHEAT), like the
    directions; `Crop.WHEAT` still works for programs that use it."""
    GRASS = "grass"
    WHEAT = "wheat"
    CARROT = "carrot"
    LETTUCE = "lettuce"
    STRAWBERRY = "strawberry"
    BLUEBERRY = "blueberry"
    PUMPKIN = "pumpkin"
    MUSHROOM = "mushroom"
    CORN = "corn"
    SUNFLOWER = "sunflower"


_CROPS = (Crop.GRASS, Crop.WHEAT, Crop.CARROT, Crop.LETTUCE, Crop.STRAWBERRY, Crop.BLUEBERRY,
          Crop.PUMPKIN, Crop.MUSHROOM, Crop.CORN, Crop.SUNFLOWER)
# Each crop by its own name, like NORTH: plant(WHEAT).
_CROP_CONSTANTS = {c.upper(): c for c in _CROPS}
# The two kinds of ground, for ground_here() == SOIL.
SOIL = "soil"

_ITEMS = ("hay", "wheat", "carrot", "lettuce", "strawberry", "blueberry",
          "pumpkin", "mushroom", "corn", "sunflower")


def _or_list(words):
    return ", ".join(words[:-1]) + " or " + words[-1]


_CROP_NAMES = _or_list([c.upper() for c in _CROPS])
# Grass gives hay, so count(GRASS) means count("hay").
_ITEM_NAMES = _or_list([c.upper() for c in _CROPS if c != "grass"] + ['"hay"'])

# Safety limits so a runaway program cannot freeze the game.
LINE_LIMIT = 300_000
# In step mode, how many lines are reported for the player to step through.
# After that, stepping goes one action at a time, so a long loop can't flood
# the page with line events.
STEP_LINE_LIMIT = 5_000


class OutOfTicks(BaseException):
    """The run used every tick it was given. Not an Exception subclass, so a
    player's `except Exception:` cannot swallow it."""


class TooManySteps(BaseException):
    """The program ran too many lines without the farmer doing anything."""


class FarmError(Exception):
    """A mistake with a friendly message that needs no error name in front."""


def _here():
    """Tell the game which line of the player's code is doing the next action,
    so the code window can light it up while Bolt does it."""
    frame = sys._getframe(2)
    while frame is not None and not _is_player_file(frame.f_code.co_filename):
        frame = frame.f_back
    if frame is not None:
        _farm.at(frame.f_code.co_filename[len(_FILE_PREFIX):-1], frame.f_lineno)


def _act(result):
    if result < 0:
        raise OutOfTicks()
    return result == 1


def _check(value, allowed, command, names):
    """`value` if it's one of `allowed` ("EAST" works like EAST), or a
    FarmError that lists what goes in the command's brackets."""
    if isinstance(value, str) and value.lower() in allowed:
        return value.lower()
    raise FarmError(f"`{command}()` needs {names}, not {value!r}.")


# ---- Actions: each takes one tick ----

def move(direction):
    """Step one tile NORTH, SOUTH, EAST or WEST (UP, DOWN, LEFT or RIGHT work too).
    Returns False at the edge."""
    direction = _check(direction, _DIRECTIONS, "move", _DIRECTION_NAMES)
    _here()
    return _act(_farm.move(direction))


def till():
    """Turn grass into soil, or soil back into grass."""
    _here()
    return _act(_farm.till())


def plant(crop):
    """Plant a crop on this tile. Returns False if it cannot be planted here."""
    crop = _check(crop, _CROPS, "plant", _CROP_NAMES)
    if crop == Crop.MUSHROOM:
        raise FarmError("Mushrooms can't be planted. They only grow by themselves, in the fog.")
    if not _farm.has_seed(crop):
        raise FarmError(f"Bolt has no {crop} seeds yet. You can buy them in the shop.")
    _here()
    return _act(_farm.plant(crop))


def harvest():
    """Harvest this tile. Returns True if the crop was ripe and collected.
    A blueberry bush stays and grows back; any other crop is gone."""
    _here()
    return _act(_farm.harvest())


def wait():
    """Do nothing for one tick."""
    _here()
    return _act(_farm.wait())


def water():
    """Wet the soil on this tile for 6 ticks, using 1 drop from the watering
    can. Corn only grows on wet soil. Returns False if the can is empty."""
    _here()
    return _act(_farm.water())


def refill():
    """Fill the watering can. Bolt has to be standing on the well."""
    _here()
    return _act(_farm.refill())


# ---- Sensing: free ----

def is_ripe():
    """True if this tile has a crop that is ready to harvest. Wilted lettuce
    isn't ripe."""
    return bool(_farm.is_ripe())


def is_rotten():
    """True if the crop on this tile has rotted. A rotten crop can't be
    picked. till() clears it away."""
    return bool(_farm.is_rotten())


def is_dry():
    """True if the soil on this tile is dry. Watering makes it wet for a while."""
    return bool(_farm.is_dry())


def water_left():
    """How many drops of water are left in the watering can (it holds 5)."""
    return _farm.water_left()


def ripe_at(x, y):
    """True if the tile at (x, y) has a ripe sunflower. Sunflowers are tall,
    so Bolt can see them from anywhere on the field."""
    for v in (x, y):
        if isinstance(v, bool) or not isinstance(v, int):
            raise FarmError(f"`ripe_at()` needs two whole numbers, like `ripe_at(2, 3)`, not {v!r}.")
    return bool(_farm.ripe_at(x, y))


def crop_here():
    """The crop on this tile (for example WHEAT), or None."""
    c = _farm.crop_here()
    return c if c else None


def ground_here():
    """GRASS or SOIL."""
    return _farm.ground_here()


def can_move(direction):
    """True if Bolt can step that way, False at the edge of the field.
    Takes the same directions as move(), UP, DOWN, LEFT and RIGHT included."""
    direction = _check(direction, _DIRECTIONS, "can_move", _DIRECTION_NAMES)
    return bool(_farm.can_move(direction))


def position():
    """Your (x, y) position. (0, 0) is the south-west corner."""
    return (_farm.pos_x(), _farm.pos_y())


def field_size():
    """How many tiles wide (and tall) the field is."""
    return _farm.field_size()


def count(item):
    """How many of an item you have, like count(WHEAT) or count("hay").
    count(GRASS) counts hay, since that's what grass gives."""
    if item == Crop.GRASS:
        item = "hay"
    item = _check(item, _ITEMS, "count", _ITEM_NAMES)
    return _farm.count(item)


def ticks():
    """Ticks used so far in this run."""
    return _farm.ticks()


def _plot_data(key):
    """A fact about this quest plot (like the rows of a design), or None.
    For commands like design() that a quest's plots answer differently."""
    return json.loads(_farm.plot_data(key))


def design():
    """The festival design for this plot: a list of rows, south row first,
    each a list of crops like WHEAT."""
    rows = _plot_data("design")
    if rows is None:
        raise FarmError("There's no design for this field. design() is for Aunt Juniper's Grand Display.")
    return rows


def order():
    """The mayor's market order for this plot: a list of the crops to bring,
    like [CARROT, SUNFLOWER]. Each crop is in it once."""
    wanted = _plot_data("order")
    if wanted is None:
        raise FarmError("There's no market order on this field. order() is for Mayor Maple's market quests.")
    return list(wanted)


def _print(*args, sep=" ", end=""):
    _farm.log(sep.join(str(a) for a in args) + end)


API = {
    "move": move, "till": till, "plant": plant, "harvest": harvest, "wait": wait,
    "water": water, "refill": refill,
    "is_ripe": is_ripe, "is_rotten": is_rotten, "is_dry": is_dry, "water_left": water_left,
    "ripe_at": ripe_at, "crop_here": crop_here, "ground_here": ground_here, "can_move": can_move,
    "position": position, "field_size": field_size, "count": count, "ticks": ticks,
    "NORTH": NORTH, "SOUTH": SOUTH, "EAST": EAST, "WEST": WEST,
    "UP": UP, "DOWN": DOWN, "LEFT": LEFT, "RIGHT": RIGHT, "Crop": Crop,
    **_CROP_CONSTANTS, "SOIL": SOIL,
    "print": _print, "design": design, "order": order,
}
# Small-letter names work too, so `move(east)` and `plant(wheat)` do what a
# young player means. The lessons still teach the capital ones.
API.update({k.lower(): v for k, v in API.items() if isinstance(v, str)})

# Every code window the player writes compiles under a filename like
# "<file:helper>", so tracebacks and the line counter know which code is theirs.
_FILE_PREFIX = "<file:"
_lines = 0
_step_lines = 0


def _filename(name):
    return f"{_FILE_PREFIX}{name}>"


def _is_player_file(filename):
    return filename.startswith(_FILE_PREFIX)


def _local_trace(frame, event, arg):
    global _lines
    if event == "line":
        _lines += 1
        if _lines > LINE_LIMIT:
            raise TooManySteps()
    return _local_trace


def _step_trace(frame, event, arg):
    """Like _local_trace, but also tells the game about every line, so the
    player can step through them one at a time. Only used in step mode, so
    normal runs stay fast."""
    global _lines, _step_lines
    if event == "line":
        _lines += 1
        if _lines > LINE_LIMIT:
            raise TooManySteps()
        if _step_lines < STEP_LINE_LIMIT:
            _step_lines += 1
            _farm.line(frame.f_code.co_filename[len(_FILE_PREFIX):-1], frame.f_lineno)
            if _step_lines == STEP_LINE_LIMIT:
                _farm.line_limit()
    return _step_trace


def _global_trace(frame, event, arg):
    # Only count lines in the player's own code.
    if _is_player_file(frame.f_code.co_filename):
        return _local_trace
    return None


def _global_step_trace(frame, event, arg):
    if _is_player_file(frame.f_code.co_filename):
        return _step_trace
    return None


def _user_frame(exc):
    """(file name, line) of the last player line in the traceback, or None."""
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if _is_player_file(f.filename)]
    if not frames:
        return None
    return frames[-1].filename[len(_FILE_PREFIX):-1], frames[-1].lineno


# Sandbox: player programs get plain Python (loops, functions, classes, lists,
# dicts...) but no dunder access, no file or eval builtins, and they can only
# import their own code windows.
_BLOCKED_BUILTINS = {
    "__import__", "open", "eval", "exec", "compile", "input", "breakpoint",
    "globals", "locals", "vars", "getattr", "setattr", "delattr", "help", "exit", "quit",
}
_SAFE_BUILTINS = {k: v for k, v in builtins.__dict__.items()
                  if k not in _BLOCKED_BUILTINS and not k.startswith("_")}
_SAFE_BUILTINS["__build_class__"] = builtins.__build_class__  # allow `class`


class PlayerError(Exception):
    """A problem in the player's code that already has a friendly message."""

    def __init__(self, message, name=None, line=None):
        super().__init__(message)
        self.message = message
        self.name = name
        self.line = line


def _where(name, main, line):
    """'Line 3' for the file being run, 'In helper, line 3' for another file."""
    if name == main:
        return f"Line {line}"
    return f"In {name}, line {line}"


def _check_sandbox(tree, name, main, files):
    """Raise PlayerError for code the sandbox does not allow."""
    for node in ast.walk(tree):
        line = getattr(node, "lineno", None)
        where = _where(name, main, line)
        modules = []
        if isinstance(node, ast.Import):
            modules = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                raise PlayerError(f"{where}: write `use helper` without any dots.")
            modules = [node.module or ""]
        for module in modules:
            if module not in files:
                raise PlayerError(
                    f"{where}: {module} is not available. You can only use your own "
                    "code windows, and there is no code window with that name.")
        attr = None
        if isinstance(node, ast.Attribute):
            attr = node.attr
        elif isinstance(node, ast.Name):
            attr = node.id
        elif isinstance(node, ast.alias):
            attr = node.asname or node.name
        if attr and attr.startswith("__") and attr.endswith("__"):
            raise PlayerError(f"{where}: names like {attr} are not available in AutoFarm programs.")


class _Loader:
    """Compiles and runs the player's code windows, and imports one window
    into another. Each window runs once per run, the first time it's used."""

    def __init__(self, files, main, locked=None):
        self.files = files
        self.main = main
        self.locked = locked or {}
        # Names that are commands, so `harvest` without brackets is a mistake.
        self.commands = API_WORDS | {"print", "design"} | defined_commands(files)
        self.used = set()
        # Every name the player's code sets, for suggesting the closest word.
        self.names = set()
        self.modules = {}
        self.loading = []
        self.builtins = dict(_SAFE_BUILTINS)
        self.builtins["__import__"] = self.import_

    def compile(self, name):
        tags = {}
        try:
            code = translate(self.files[name], tags)
        except PlainWordsError as e:
            if name == self.main:
                raise PlayerError(e.message, name, e.line) from None
            raise PlayerError(f"In {name}, l{e.message[1:]}", name, e.line) from None
        try:
            tree = ast.parse(code, _filename(name))
        except SyntaxError as e:
            where = _where(name, self.main, e.lineno)
            lines = self.files[name].split("\n")
            hint = None
            if e.lineno and e.lineno <= len(lines) and not isinstance(e, IndentationError):
                line = lines[e.lineno - 1]
                hint = spaced_hint(line, self.commands) or syntax_hint(line, self.commands)
            msg = f"{where}: {hint}" if hint else f"{where}: SyntaxError: {e.msg}"
            raise PlayerError(msg, name, e.lineno) from None
        _check_sandbox(tree, name, self.main, self.files)
        self._check_words(tree, tags, name)
        missing = find_missing(tree, self.commands)
        if missing:
            line, command, kind = missing
            raise PlayerError(f"{_where(name, self.main, line)}: {brackets_message(command, kind)}", name, line)
        stored = stored_names(tree)
        self.names |= stored
        wrong = wrong_count(tree, API, stored | defined_commands(self.files))
        if wrong:
            line, msg = wrong
            raise PlayerError(f"{_where(name, self.main, line)}: {msg}", name, line)
        return compile(tree, _filename(name), "exec")

    def _check_words(self, tree, tags, name):
        """Note the coding words this window uses, and stop at the first one
        Bolt hasn't learned yet."""
        for word, line in find_words(tree, tags):
            if word in self.locked:
                raise PlayerError(f"{_where(name, self.main, line)}: {self.locked[word]}", name, line)
            self.used.add(word)

    def run(self, name, env):
        env["__builtins__"] = self.builtins
        env.update(API)
        env.update(HELPERS)
        compiled = self.compile(name)
        self.loading.append(name)
        try:
            exec(compiled, env)
        finally:
            self.loading.pop()

    def import_(self, name, globals=None, locals=None, fromlist=(), level=0):
        if level or name not in self.files:
            raise PlayerError(f"There is no code window called {name}.")
        if name in self.loading:
            chain = " -> ".join(self.loading[self.loading.index(name):] + [name])
            raise PlayerError(
                f"Your code windows use each other in a circle ({chain}). "
                "Move the shared commands into a window that doesn't use the others.")
        if name not in self.modules:
            module = types.ModuleType(name)
            self.modules[name] = module
            try:
                self.run(name, module.__dict__)
            except BaseException:
                del self.modules[name]
                raise
        return self.modules[name]


def _parse_json(value):
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def _parse_files(files):
    return {str(k): str(v) for k, v in _parse_json(files).items()}


_used = []
_error_at = []


def error_line():
    """[code window name, line] where the last run stopped with a problem, or []."""
    return list(_error_at)


def used_words():
    """The coding words the last run used (see py/words.py), sorted."""
    return list(_used)


def _friendly(e, loader):
    """Bolt's words for a mistake Python found while running, or None."""
    if isinstance(e, FarmError):
        return str(e)
    if type(e) is NameError and getattr(e, "name", None):
        return name_error(e.name, API, loader.commands, loader.names)
    if type(e) is TypeError:
        return type_error(str(e))
    return None


def run(code, files=None, name="main", locked=None, step=False):
    """Run a player's program. `code` is the code window being run and `name`
    is its name. `files` maps the names of the other code windows to their code
    (a dict or a JSON string), so the program can use them. `locked` maps each
    coding word Bolt doesn't know yet to what Bolt says about it (a dict or a
    JSON string); using one stops the program before it starts. With `step`,
    every line the program runs is reported through `_farm.line`, for the
    first STEP_LINE_LIMIT lines, so the player can step through it.

    Returns [status, message] where status is 'ok', 'out_of_ticks',
    'too_many_steps' or 'error'."""
    global _lines, _step_lines, _used, _error_at
    _lines = 0
    _step_lines = 0
    _error_at = []
    files = _parse_files(files)
    files[name] = code
    loader = _Loader(files, name, {str(k): str(v) for k, v in _parse_json(locked).items()})
    _used = []
    env = {"__name__": "__main__"}
    sys.settrace(_global_step_trace if step else _global_trace)
    try:
        loader.run(name, env)
    except PlayerError as e:
        if e.name is not None and e.line:
            _error_at = [e.name, e.line]
        return ["error", e.message]
    except OutOfTicks:
        return ["out_of_ticks", "The farmer ran out of ticks for this run."]
    except TooManySteps as e:
        found = _user_frame(e)
        where = ""
        if found:
            _error_at = list(found)
            where = f" (around line {found[1]}" + ("" if found[0] == name else f" of {found[0]}") + ")"
        return ["too_many_steps",
                f"Your program ran {LINE_LIMIT:,} lines without finishing{where}. "
                "Is there a loop that never ends without the farmer doing anything?"]
    except BaseException as e:  # noqa: BLE001 - report every player error
        found = _user_frame(e)
        if found:
            _error_at = list(found)
        msg = _friendly(e, loader) or f"{type(e).__name__}: {e}"
        return ["error", f"{_where(found[0], name, found[1])}: {msg}" if found else msg]
    finally:
        sys.settrace(None)
        _used = sorted(loader.used)
    return ["ok", "Program finished."]
