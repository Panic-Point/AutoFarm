# AutoFarm

A browser farming game where you write Python to automate a farmer.

Your program runs in the browser with [Pyodide](https://pyodide.org). The farm is a grid of tiles. Every farmer action (`move`, `till`, `plant`, `harvest`, `wait`) takes one tick, crops grow every tick, and looking around (`is_ripe()`, `position()` and so on) is free. The full command list is on the game page.

## Run it locally

It's a static site with no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk won't work, because browsers block web workers on `file://` URLs.

## How it works

- `js/game.js`: the farm simulation, with no DOM code.
- `py/farm_api.py`: the Python commands players use, plus the sandbox. It blocks imports, dunder names and file or eval builtins, and limits runaway loops.
- `js/worker.js`: a web worker that loads Pyodide and runs the player's program at full speed against a copy of the farm. It streams one snapshot per tick, plus `print()` output, back to the page.
- `js/main.js`: the page. It replays the snapshots at the chosen speed, and handles Run, Stop and Reset.
- `js/render.js`: canvas drawing.

Each run can use up to 5,000 ticks. The farm and your code are saved in the browser's local storage for now. Accounts and cloud saves are planned.

## Tests

```sh
npm test
```

This runs the simulation tests with Node and the Python API and sandbox tests with CPython, using a fake farm module.
