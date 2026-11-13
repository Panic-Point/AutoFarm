# AutoFarm

A browser farming game where you write code to automate Bolt, a little farm robot. It's made for kids (6 and up, with a grown-up to help read) learning to program: loops and choices read like plain words, closer to Scratch, but you type them.

## Chapters, quests and stars

The game is 8 chapters at Willow Creek Farm, and each one teaches one coding idea through short quests from a neighbor:

| # | Chapter | Bolt learns |
| --- | --- | --- |
| 1 | First Steps | `move`, `harvest` |
| 2 | Do It Again | `repeat 5 times:` (plus `till`, `plant`, `wait`) |
| 3 | Loops in Loops | a repeat inside a repeat |
| 4 | Look Before You Act | `if` / `else`, `is_ripe()`, `ground_here()` |
| 5 | Until It's Done | `repeat until`, `repeat while`, `can_move()` |
| 6 | Keeping Count | `set` / `change`, `count()`, `for x from 1 to 5:` |
| 7 | Teach Bolt | `define`, `use helper` |
| 8 | Big Farm Plans | lists and `for each`, ending at the Harvest Festival |

- **Quests** run on their own field, which starts over on every try. Finishing a quest gives 1 star; finishing within a tick (cycle) limit gives 2, and within a tighter one 3. Quests in a chapter open one after another.
- **Chapters** open when the one before is finished and you have enough stars.
- **Locked words:** a coding word stays locked until its chapter opens. Using it early stops the run with a note like "Bolt doesn't know repeat yet. You'll learn it in chapter 2!", and the command list greys it out. Anything no chapter teaches (classes, lambdas, try...) opens after the festival.
- **The home farm** is free play. Everything harvested, in quests too, goes to the barn, and the shop sells field upgrades, seeds, hats for Bolt and farm decorations for produce. Each finished chapter puts new things in the shop and a badge on the shelf. The shelf also has the almanac (a page per crop) and titles.
- **For grown-ups:** the shelf has a practice mode that opens every chapter and word, and a button to start progress over.

## Crops

| Crop | Costs | Ripe after | Gives | Special rule |
| --- | --- | --- | --- | --- |
| Grass | free | 4 ticks | 1 hay | Grows back by itself. |
| Wheat | free | 8 ticks | 1 wheat | |
| Carrot | 2 wheat | 14 ticks | 1 carrot | |
| Strawberry | 3 wheat | 12 ticks | 1 + 1 per friend | **Friends:** when it ripens it counts the strawberries right next to it, and gives 1 more for each. A *layout puzzle*: 4 in a row make 10, a 2 by 2 square makes 12, and picking one before its neighbours ripen leaves them fewer friends. |
| Lettuce | 2 hay | 6 ticks | 1 lettuce | **Wilts:** it stays crisp for 8 ticks, then wilts and gives nothing. A *scheduling puzzle*: first planted, first picked, so the order Bolt walks matters (a queue). |
| Blueberry | 2 carrots | 24 ticks | 2, 3, 4, 5, 5... | **Bush:** stays after a ripe harvest and is ripe again 10 ticks later, giving 1 more each time up to 5. Picking it early loses the whole bush. A *keep-it-running puzzle*: a patrol loop with `repeat until count(...)` beats replanting. |

Each new crop has a bonus quest built around its rule (3-5 Berry Friends, 4-5 Crunchy Lettuce, 6-5 Two Old Bushes) and its seeds go in the shop after that chapter. Bonus quests give stars but aren't needed to finish a chapter.

Quests are plain data in `js/chapters.js`, so adding one needs no new code. `tests/solutions.mjs` holds a 3-star program for every quest, and the tests run them all with the real game and Python, so the star targets always stay within reach.

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
- `js/chapters.js`: the story, chapters and quests, as data.
- `js/quests.js`: builds a quest's field and checks its goal and stars.
- `js/progress.js`: stars, open chapters, the shop, badges, almanac and titles.
- `js/words.js`: the coding words and which chapter teaches each.
- `py/words.py`: finds the coding words a program uses, for the locks.
- `py/plain_words.py`: turns plain-word lines like `repeat 5 times:` into Python.
- `py/farm_api.py`: the Python commands players use, plus the sandbox. It only lets programs import the player's own code windows, and blocks dunder names and file or eval builtins, and limits runaway loops.
- `js/worker.js` and `js/bridge.js`: a web worker that loads Pyodide and runs the player's program at full speed against a copy of the farm. It streams one snapshot per tick, plus `print()` output, back to the page.
- `js/files.js`: window names, the starter windows, and loading saved windows.
- `js/windows.js`: the desk of code windows (move, resize, rename, hide, delete, run).
- `js/main.js`: the page. It replays the snapshots at the chosen speed, handles Run, Stop and Reset, judges quests, and draws the map, shop and shelf.
- `js/render.js`: canvas drawing.

Each run can use up to 5,000 ticks. Progress, the home farm and your code windows are saved in the browser's local storage for now. Accounts and cloud saves are planned.

## Tests

```sh
npm install
npm test
```

This runs the simulation, progress and quest tests with Node, including every quest solution with Pyodide from `node_modules`, and the Python API and sandbox tests with CPython, using a fake farm module.
