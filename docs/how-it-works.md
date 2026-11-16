# How it works

AutoFarm is a static site: plain HTML, CSS and ES modules, with no build step and no server code. This page lists what each source file does. For the big picture, see [Architecture](../README.md#architecture) in the README.

## Source files

- `js/game.js`: the farm simulation, with no DOM code.
- `js/chapters.js`: the story, chapters and quests, as data.
- `js/postgame.js`: golden quests and the contract board, as data.
- `js/quests.js`: builds a quest's field and checks its goal and stars.
- `js/progress.js`: stars, open chapters, the shop, badges, almanac and titles.
- `js/words.js`: the coding words and which chapter teaches each.
- `js/concepts.js`: the Farm Book, as data: one entry per command, idea and crop, with its example program. The lesson cards and the Farm Book are both built from it.
- `py/words.py`: finds the coding words a program uses, for the locks.
- `py/plain_words.py`: turns plain-word lines like `repeat 5 times:` into Python.
- `py/farm_api.py`: the Python commands players use, plus the sandbox. It only lets programs import the player's own code windows, and blocks dunder names and file or eval builtins, and limits runaway loops.
- `js/worker.js` and `js/bridge.js`: a web worker that loads Pyodide and runs the player's program at full speed against a copy of the farm. It streams one snapshot per tick, plus `print()` output, back to the page.
- `js/files.js`: window names, the starter windows, and loading saved windows.
- `js/windows.js`: the desk of code windows (move, resize, rename, hide, delete, run).
- `js/playback.js`: plays a run's events back, at the chosen speed or one line at a time for the Step button. A run started with Step reports every line it runs (the first 5,000), and after that Step goes one action at a time. Normal runs don't report lines, so they stay fast.
- `js/main.js`: the page. It replays the snapshots at the chosen speed, handles Run, Stop, Step, Keep going and Reset, judges quests, and draws the map, shop, shelf, lesson cards and Farm Book. Lesson and Farm Book examples run in the same worker on their own little field.
- `js/render.js`: canvas drawing.

## Limits and saving

Each run can use up to 5,000 ticks. Progress, the home farm and your code windows are saved in the browser's local storage for now. Accounts and cloud saves are planned.

## Docs

`scripts/build-docs.mjs` builds `docs/chapters.md` and `docs/solutions.md` from `js/chapters.js`, `js/postgame.js`, `js/words.js` and `tests/solutions.mjs`, plus the hand-written notes in `scripts/docs-notes.mjs`. It uses `py/words.py` (with CPython) to find which coding words each solution practices. `tests/docs.test.mjs` fails when the files are out of date, or when a word or quest has no note.
