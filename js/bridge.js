// The `_farm` module that the player's Python talks to. It runs one program
// against a copy of the farm and collects a snapshot per action, plus print()
// output. Used by the worker, and by the tests that run quest solutions.
import { Game, ripeAt } from "./game.js";

export const MAX_TICKS = 5000;

export class FarmBridge {
  // onEvents(events) is called with batches of { kind: "frame"|"log", ... }.
  constructor(onEvents = () => {}, batch = 100) {
    this.onEvents = onEvents;
    this.batch = batch;
    this.game = null;
    this.startTick = 0;
    this.events = [];
    this.data = {};
    const act = (fn) => this.act(fn);
    const game = () => this.game;
    this.module = {
      move: (d) => act(() => game().move(d)),
      till: () => act(() => game().till()),
      plant: (c) => act(() => game().plant(c)),
      harvest: () => act(() => game().harvest()),
      wait: () => act(() => game().wait()),
      water: () => act(() => game().water()),
      refill: () => act(() => game().refill()),
      is_ripe: () => game().isRipe(),
      is_rotten: () => game().isRotten(),
      is_dry: () => game().isDry(),
      water_left: () => game().can,
      ripe_at: (x, y) => ripeAt(game(), x, y),
      crop_here: () => game().here.crop || "",
      ground_here: () => game().here.ground,
      can_move: (d) => game().canMove(d),
      has_seed: (c) => game().hasSeed(c),
      pos_x: () => game().x,
      pos_y: () => game().y,
      field_size: () => game().size,
      count: (item) => game().inventory[item] ?? 0,
      ticks: () => game().tick - this.startTick,
      // Facts about this plot (a quest's plot `data`), as JSON, or "null".
      plot_data: (key) => JSON.stringify(this.data[String(key)] ?? null),
      // The line of the player's code doing the next action: [window, line].
      at: (name, line) => {
        this.where = { name: String(name), line: Number(line) };
      },
      log: (text) => {
        this.events.push({ kind: "log", text: String(text) });
      },
    };
  }

  // maxTicks: how many ticks this run may use before Bolt gets tired.
  // data: facts about the plot the program can read with plot_data.
  start(state, maxTicks = MAX_TICKS, data = {}) {
    this.data = data ?? {};
    this.maxTicks = Math.min(maxTicks, MAX_TICKS);
    this.game = new Game(state);
    this.startTick = this.game.tick;
    this.events = [];
    this.where = null;
  }

  get ticks() {
    return this.game.tick - this.startTick;
  }

  act(fn) {
    if (this.ticks >= this.maxTicks) return -1;
    const ok = fn();
    this.events.push({ kind: "frame", state: this.game.snapshot(), at: this.where });
    if (this.events.length >= this.batch) this.flush();
    return ok ? 1 : 0;
  }

  flush() {
    if (this.events.length) {
      this.onEvents(this.events);
      this.events = [];
    }
  }

  // Run a program with farm_api (a Pyodide proxy). msg: { code, files, name, locked }.
  // Returns { status, message, ticks, words, errorAt }, where errorAt is
  // { name, line } for the line a problem stopped on, or null.
  run(api, msg) {
    let status = "error";
    let message = "";
    let words = [];
    let errorAt = null;
    try {
      const result = api.run(
        msg.code,
        JSON.stringify(msg.files ?? {}),
        msg.name ?? "main",
        JSON.stringify(msg.locked ?? {}),
      );
      [status, message] = result.toJs();
      result.destroy();
      const used = api.used_words();
      words = used.toJs();
      used.destroy();
      const where = api.error_line();
      const [name, line] = where.toJs();
      where.destroy();
      if (name !== undefined) errorAt = { name, line };
    } catch (err) {
      message = `Internal error: ${err}`;
    }
    this.flush();
    if (status === "out_of_ticks") message = `Bolt got tired and stopped. This run had ${this.maxTicks.toLocaleString("en-US")} ticks.`;
    return { status, message, ticks: this.ticks, words, errorAt };
  }
}

// The Python files the worker loads, in order.
export const PY_FILES = ["plain_words.py", "words.py", "brackets.py", "farm_api.py"];
