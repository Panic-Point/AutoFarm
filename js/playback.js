// Plays back a run's events (see bridge.js) on the page: at the chosen speed,
// or one line at a time while the player steps through it. No DOM code, so
// the tests run it in Node.
//
// run: { queue, pos, at, lines, lineLimit }
//   queue, pos: the events from the worker, and the next one to play.
//   at: { name, line } of the line being shown, or null.
//   lines: true if the run reports every line ("line" events, step mode).
//   lineLimit: set once the run has stopped reporting lines.
// apply(ev) is called, in order, for every event except "line" events.

// Drop played events now and then so the queue doesn't grow forever.
function trim(run) {
  if (run.pos > 2000) {
    run.queue = run.queue.slice(run.pos);
    run.pos = 0;
  }
}

// Normal playback: logs right away, and up to maxFrames frames. Returns how
// many frames it played. run.at follows the line of the last frame.
export function play(run, maxFrames, apply) {
  let frames = 0;
  while (run.pos < run.queue.length) {
    const ev = run.queue[run.pos];
    // Out of frames: stop before the next line too, so a Step from here
    // starts at the right line.
    if (frames >= maxFrames && ev.kind !== "log") break;
    if (ev.kind === "frame") {
      run.at = ev.at;
      frames += 1;
    }
    if (ev.kind === "line_limit") run.lineLimit = true;
    if (ev.kind !== "line") apply(ev);
    run.pos += 1;
  }
  trim(run);
  return frames;
}

// True when a step goes to the next action instead of the next line: the run
// doesn't report lines, or has stopped reporting them.
export function stepsByAction(run) {
  return !run.lines || Boolean(run.lineLimit);
}

// One step: play events up to and including the next line event and stop
// there, with run.at on that line. The farm then shows what the program has
// done before that line. When stepping by action, stop after the next frame
// instead. Returns true if it stopped, or false if the queue ran out first
// (more events are on the way, or the run is over).
export function step(run, apply) {
  let stopped = false;
  while (!stopped && run.pos < run.queue.length) {
    const ev = run.queue[run.pos];
    run.pos += 1;
    if (ev.kind === "line") {
      run.at = ev.at;
      stopped = true;
      continue;
    }
    if (ev.kind === "line_limit") run.lineLimit = true;
    apply(ev);
    if (ev.kind === "frame" && stepsByAction(run)) {
      run.at = ev.at;
      stopped = true;
    }
  }
  trim(run);
  return stopped;
}
