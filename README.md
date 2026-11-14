# AutoFarm

## Overview

A browser farming game where you write code to automate Bolt, a little farm robot. It's made for kids (6 and up, with a grown-up to help read) learning to program: loops and choices read like plain words, closer to Scratch, but you type them.

The game is 8 chapters at Willow Creek Farm, and each one teaches one coding idea (doing things in order, repeating, loops in loops, choices, loops that stop, counting, your own commands, and lists) through short quests from the neighbors, ending with Festival Day. After the festival there are golden quests, a contract board and a home farm to play on. Players write plain-word code like `repeat 5 times:` or `set total to 0`, which turns into Python, and it all runs in the browser.

More in [`docs/`](docs/README.md):

- [Game design](docs/design.md): chapters, quests and stars, crops, plain-word code and code windows.
- [How it works](docs/how-it-works.md): what each source file does, run limits, the sandbox and saving.

## Architecture

AutoFarm is a static site: HTML, CSS and ES modules, with no build step and no server code. Player programs run in the browser with [Pyodide](https://pyodide.org) 0.26.4 (Python compiled to WebAssembly), loaded from the jsDelivr CDN.

```
 page (js/main.js)                              web worker (js/worker.js)
 ┌───────────────────────────┐   code windows   ┌──────────────────────────────┐
 │ code windows, map, shop   │ ───────────────▶ │ Pyodide runs the program     │
 │ replays snapshots at the  │                  │ against a copy of the farm   │
 │ chosen speed, judges the  │ ◀─────────────── │ (js/game.js via bridge.js)   │
 │ quest, draws the canvas   │  one snapshot    │ plain words → Python first   │
 └───────────────────────────┘  per tick        │ (py/plain_words.py)          │
            │                   + print output   └──────────────────────────────┘
            ▼
     local storage (progress, home farm, code windows)
```

When the player presses Run, the page (`js/main.js`) sends the code windows to a web worker (`js/worker.js`). The worker turns plain-word lines into Python, runs the program with Pyodide at full speed against a copy of the farm simulation (`js/game.js`), and streams one snapshot per tick, plus any `print()` output, back to the page. The page replays the snapshots at the chosen speed, checks the quest's goal and stars (`js/quests.js`), and draws the farm. The farm, the quests and the progress rules are plain JavaScript with no DOM code, so the tests run them directly in Node.

The per-file breakdown, the 5,000-tick limit and the sandbox rules are in [How it works](docs/how-it-works.md).

## Install and run locally

You need:

- Python 3, to serve the folder (any static file server works),
- Node.js and npm, only for the tests.

Start a local server from the repo folder:

```sh
npm start
# or, without npm:
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk won't work, because browsers block web workers on `file://` URLs.

To put it online for free, serve the repo folder from any static host. For example, with GitHub Pages: Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.

## Tests

```sh
npm install
npm test
```

`npm install` fetches Pyodide 0.26.4 into `node_modules`, so the quest tests run the same Python the browser does. `npm test` runs:

- **Node tests** (`tests/*.test.mjs`, with `node --test`):
  - `game.test.mjs`: the farm simulation and the crop rules.
  - `quests.test.mjs`: the quest data, and every quest's 3-star solution from `tests/solutions.mjs`, run with the real game and Pyodide, so the star targets always stay within reach.
  - `progress.test.mjs`: stars, open chapters, the shop, badges, golden quests and contracts.
  - `files.test.mjs`: code window names and loading saved windows.
  - `title.test.mjs`: the title screen's Continue and Replay a chapter.
- **Python tests** (`tests/test_farm_api.py`, with CPython): the player commands, plain-word code and the sandbox, against a fake farm module.

To run one file on its own:

```sh
node --test tests/game.test.mjs
python3 tests/test_farm_api.py
```
