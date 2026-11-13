# AutoFarm

A browser farming game where you write code to automate a farmer. It's made for kids learning to program: loops and choices read like plain words, closer to Scratch, but you type them.

Your program runs in the browser with [Pyodide](https://pyodide.org). The farm is a grid of tiles. Every farmer action (`move`, `till`, `plant`, `harvest`, `wait`) takes one tick, crops grow every tick, and looking around (`is_ripe()`, `position()` and so on) is free. The full command list is on the game page.

## Plain-word code

Alongside regular Python, programs can use plain-word statements:

```
set size to field_size()

define harvest_if_ripe:
    if is_ripe():
        harvest()

repeat size times:
    harvest_if_ripe()
    move(EAST)

repeat until position() == (0, 0):
    move(WEST)
```

| Plain words | Python it stands for |
| --- | --- |
| `repeat 5 times:` or `for amount times:` | `for _ in range(5):` |
| `repeat forever:` | `while True:` |
| `repeat until done:` | `while not done:` |
| `repeat while busy:` | `while busy:` |
| `for x from 1 to 10:` (includes 10, counts down if needed) | `for x in range(1, 11):` |
| `for each item in things:` | `for item in things:` |
| `else if ...:` | `elif ...:` |
| `define sweep_row:` / `define go(steps):` | `def sweep_row():` / `def go(steps):` |
| `set total to 0` / `change total by 1` | `total = 0` / `total += 1` |
| `true` / `false` | `True` / `False` |

## Code windows

Code can be split across several named windows, like files. Make one with **+ New window**, drag windows around by their title bar, and double-click a name to rename it. Any window can use the commands and classes another window makes:

```
use helper                  # everything from the helper window
use helper, crops           # two windows at once
use go_home from helper     # just one command
```

Python's `from helper import *` and `import helper` work too. Every window has its own run button, and **Run** at the top runs the window used last. A window you use runs once per run, the first time it's used, and an error inside it says which window and line it came from. Windows can't import anything except each other.

`py/plain_words.py` rewrites these lines into Python before the program runs, one line for one line, so error messages keep the player's line numbers. A line that starts like a plain-word statement but isn't written right gets a hint instead of a Python syntax error.

## Run it locally

It's a static site with no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk won't work, because browsers block web workers on `file://` URLs.

## How it works

- `js/game.js`: the farm simulation, with no DOM code.
- `py/plain_words.py`: turns plain-word lines like `repeat 5 times:` into Python.
- `py/farm_api.py`: the Python commands players use, plus the sandbox. It only lets programs import the player's own code windows, and blocks dunder names and file or eval builtins, and limits runaway loops.
- `js/worker.js`: a web worker that loads Pyodide and runs the player's program at full speed against a copy of the farm. It streams one snapshot per tick, plus `print()` output, back to the page.
- `js/files.js`: window names, the starter windows, and loading saved windows.
- `js/windows.js`: the desk of code windows (move, resize, rename, hide, delete, run).
- `js/main.js`: the page. It replays the snapshots at the chosen speed, and handles Run, Stop and Reset.
- `js/render.js`: canvas drawing.

Each run can use up to 5,000 ticks. The farm and your code windows are saved in the browser's local storage for now. Accounts and cloud saves are planned.

## Tests

```sh
npm test
```

This runs the simulation tests with Node and the Python API and sandbox tests with CPython, using a fake farm module.
