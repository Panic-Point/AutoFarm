# How it works

AutoFarm is a static site: plain HTML, CSS and ES modules, with no build step and no server code. This page lists what each source file does. For the big picture, see [Architecture](../README.md#architecture) in the README.

## Source files

- `js/game.js`: the farm simulation, with no DOM code.
- `js/chapters.js`: the story, chapters and quests, as data.
- `js/postgame.js`: golden quests and the contract board, as data.
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

## Limits and saving

Each run can use up to 5,000 ticks. Progress, the home farm and your code windows are saved in the browser's local storage for now. Accounts and cloud saves are planned.
