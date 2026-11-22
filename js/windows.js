// The desk of code windows: each window is a named file the player can move,
// resize, rename, hide, delete and run. Other windows can use its commands
// with `use <name>`.
import { nameProblem, newWindow, nextName, normalizeName } from "./files.js";
import { backspaceDedent, lineDedent } from "./indent.js";
import { insertWord } from "./simple.js";

const SMALL_SCREEN = window.matchMedia("(max-width: 760px)");
const MIN_W = 220;
const MIN_H = 140;

export class Desk {
  // opts: { desk, bar, workspace, onChange(workspace), onRun(name), onMessage(text, cls) }
  constructor(opts) {
    Object.assign(this, opts);
    this.views = new Map(); // name -> { el, textarea, nameEl, data }
    this.runningName = null;
    // Making, hiding, deleting and renaming windows. Off until the chapter
    // that needs more than one window (see setTools).
    this.tools = true;
    for (const data of this.workspace.windows) this.addView(data);
    this.focusOrder();
    this.renderBar();
    window.addEventListener("resize", () => this.clampAll());
    new ResizeObserver(() => this.clampAll()).observe(this.desk);
  }

  get active() {
    return this.workspace.active;
  }

  names() {
    return this.workspace.windows.map((w) => w.name);
  }

  // Everything the worker needs to run window `name`.
  program(name) {
    const files = {};
    for (const w of this.workspace.windows) if (w.name !== name) files[w.name] = w.code;
    return { name, code: this.views.get(name).data.code, files };
  }

  setRunning(name) {
    this.runningName = name;
    for (const [n, v] of this.views) v.el.classList.toggle("running", n === name);
    for (const chip of this.bar.querySelectorAll(".chip[data-name]")) {
      chip.classList.toggle("running", chip.dataset.name === name);
    }
  }

  save() {
    this.onChange(this.workspace);
  }

  // Turn the window tools on or off. With them off, each window has no
  // buttons of its own, and with only one window the chips above the desk
  // go too. Hidden windows come back, since they can't be hidden any more.
  setTools(on) {
    this.tools = on;
    this.desk.classList.toggle("no-tools", !on);
    for (const view of this.views.values()) view.nameEl.title = on ? "Double-click to rename" : "";
    if (!on) {
      for (const view of this.views.values()) {
        if (view.data.hidden) {
          view.data.hidden = false;
          this.clamp(view);
          this.updateView(view);
        }
      }
    }
    this.renderBar();
  }

  // Put a tapped word into the active window, at the cursor (see insertWord).
  insert(word) {
    const view = this.views.get(this.active);
    if (!view) return;
    const ta = view.textarea;
    const out = insertWord(ta.value, ta.selectionStart, word);
    ta.value = out.code;
    ta.setSelectionRange(out.at, out.at);
    ta.dispatchEvent(new Event("input"));
    // Show the new line, without opening a tablet's keyboard.
    const { height, pad } = this.lineBox(view);
    const line = out.code.slice(0, out.at).split("\n").length;
    const top = pad + (line - 1) * height;
    if (top < ta.scrollTop || top + height > ta.scrollTop + ta.clientHeight - pad) {
      ta.scrollTop = Math.max(0, top - ta.clientHeight + height + pad);
    }
  }

  // ---- Marking a line ----

  // Light up one line of code: the line Bolt is running (kind "run"), the
  // line a stepped-through program is paused on (kind "step"), or the line a
  // problem stopped on (kind "error"). `at` is { name, line }, or null
  // to clear the mark. The window holding the line comes to the front while
  // it's marked, and scrolls so the line can be seen.
  showLine(at, kind = "run") {
    const prev = this.marked;
    const view = at && this.views.get(at.name);
    this.marked = view ? { name: at.name, line: at.line, kind } : null;
    if (prev && (!view || prev.name !== at.name)) {
      const old = this.views.get(prev.name);
      if (old) {
        old.mark.hidden = true;
        old.el.classList.remove("has-mark");
      }
      this.focusOrder(); // put back the stacking order the player chose
      for (const chip of this.bar.querySelectorAll(".chip.has-mark")) chip.classList.remove("has-mark");
    }
    if (!view) return;
    if (!prev || prev.name !== at.name) {
      view.el.classList.add("has-mark");
      view.el.style.zIndex = String(this.views.size + 1);
      this.bar.querySelector(`.chip[data-name="${CSS.escape(at.name)}"]`)?.classList.add("has-mark");
    }
    view.mark.classList.toggle("error", kind === "error");
    view.mark.classList.toggle("step", kind === "step");
    this.scrollToLine(view, at.line);
    this.placeMark(view);
  }

  lineBox(view) {
    const style = getComputedStyle(view.textarea);
    const height = parseFloat(style.lineHeight) || 21;
    return { height, pad: parseFloat(style.paddingTop) || 0 };
  }

  scrollToLine(view, line) {
    const ta = view.textarea;
    const { height, pad } = this.lineBox(view);
    const top = pad + (line - 1) * height;
    if (top < ta.scrollTop || top + height > ta.scrollTop + ta.clientHeight - pad) {
      ta.scrollTop = Math.max(0, top - ta.clientHeight / 2 + height / 2);
    }
  }

  placeMark(view) {
    const m = this.marked;
    if (!m || m.name !== view.data.name || view.data.hidden) {
      view.mark.hidden = true;
      return;
    }
    const ta = view.textarea;
    const { height, pad } = this.lineBox(view);
    const y = pad + (m.line - 1) * height - ta.scrollTop;
    // Hide the mark when its line is scrolled out of sight.
    view.mark.hidden = y < 0 || y + height > ta.clientHeight;
    view.mark.style.top = `${ta.offsetTop + y}px`;
    view.mark.style.height = `${height}px`;
  }

  // ---- Building windows ----

  addView(data) {
    const el = document.createElement("div");
    el.className = "code-window";
    el.innerHTML = `
      <div class="window-bar">
        <button class="win-run" type="button" title="Run this window">&#9654;</button>
        <span class="win-name" tabindex="0" title="Double-click to rename"></span>
        <button class="win-hide icon" type="button" title="Hide this window">&#8211;</button>
        <button class="win-delete icon" type="button" title="Delete this window">&#215;</button>
      </div>
      <textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea>
      <div class="line-mark" hidden aria-hidden="true"></div>
      <div class="win-confirm" hidden>
        <span></span>
        <button class="danger" type="button">Delete</button>
        <button class="secondary" type="button">Keep</button>
      </div>`;
    const view = {
      el,
      data,
      textarea: el.querySelector("textarea"),
      nameEl: el.querySelector(".win-name"),
      confirm: el.querySelector(".win-confirm"),
      mark: el.querySelector(".line-mark"),
    };
    view.textarea.value = data.code;
    if (!this.tools) view.nameEl.title = "";
    this.views.set(data.name, view);
    this.desk.append(el);
    this.updateView(view);
    this.wire(view);
    return view;
  }

  updateView(view) {
    const { el, data, nameEl, textarea } = view;
    el.dataset.name = data.name;
    nameEl.textContent = data.name;
    textarea.setAttribute("aria-label", `Code window ${data.name}`);
    el.hidden = data.hidden;
    el.style.left = `${data.x}px`;
    el.style.top = `${data.y}px`;
    el.style.width = `${data.w}px`;
    el.style.height = `${data.h}px`;
    el.classList.toggle("active", data.name === this.active);
    if (this.marked?.name === data.name) this.placeMark(view);
  }

  wire(view) {
    const { el, textarea } = view;
    el.addEventListener("pointerdown", () => this.focus(view.data.name, false));
    textarea.addEventListener("focus", () => this.focus(view.data.name, false));
    textarea.addEventListener("scroll", () => this.placeMark(view));
    textarea.addEventListener("input", () => {
      // The code changed, so a line marked as a problem may not be the problem any more.
      if (this.marked?.kind === "error" && this.marked.name === view.data.name) this.showLine(null);
      view.data.code = textarea.value;
      this.save();
    });
    textarea.addEventListener("keydown", (e) => this.editorKeys(e, view));
    el.querySelector(".win-run").addEventListener("click", () => {
      this.focus(view.data.name, false);
      this.onRun(view.data.name);
    });
    el.querySelector(".win-hide").addEventListener("click", () => this.hide(view.data.name));
    el.querySelector(".win-delete").addEventListener("click", () => this.askDelete(view));
    const [yes, no] = view.confirm.querySelectorAll("button");
    yes.addEventListener("click", () => this.remove(view.data.name));
    no.addEventListener("click", () => (view.confirm.hidden = true));
    // Listen on the whole bar: dragging captures the pointer, so the
    // double-click lands on the bar rather than the name.
    el.querySelector(".window-bar").addEventListener("dblclick", (e) => {
      if (!e.target.closest("button, input")) this.startRename(view);
    });
    view.nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        this.startRename(view);
      }
    });
    this.wireDrag(view);
    // Remember the size after the player drags the resize corner.
    new ResizeObserver(() => {
      if (el.hidden || SMALL_SCREEN.matches) return;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w && h && (w !== view.data.w || h !== view.data.h)) {
        view.data.w = w;
        view.data.h = h;
        this.save();
      }
    }).observe(el);
  }

  wireDrag(view) {
    const bar = view.el.querySelector(".window-bar");
    bar.addEventListener("pointerdown", (e) => {
      if (SMALL_SCREEN.matches || e.button !== 0 || e.target.closest("button, input")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const { x, y } = view.data;
      bar.setPointerCapture(e.pointerId);
      view.el.classList.add("dragging");
      const move = (ev) => {
        view.data.x = x + ev.clientX - startX;
        view.data.y = y + ev.clientY - startY;
        this.clamp(view);
        this.updateView(view);
      };
      const up = () => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
        view.el.classList.remove("dragging");
        this.save();
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
  }

  // Keep a window inside the desk, so it can't be lost off the edge.
  clamp(view) {
    const d = view.data;
    const W = this.desk.clientWidth;
    const H = this.desk.clientHeight;
    if (!W || !H) return;
    d.w = Math.max(MIN_W, Math.min(d.w, W));
    d.h = Math.max(MIN_H, Math.min(d.h, H));
    d.x = Math.round(Math.max(0, Math.min(d.x, W - d.w)));
    d.y = Math.round(Math.max(0, Math.min(d.y, H - d.h)));
  }

  clampAll() {
    if (SMALL_SCREEN.matches) return;
    for (const view of this.views.values()) {
      this.clamp(view);
      this.updateView(view);
    }
  }

  // ---- Editor keys ----

  editorKeys(e, view) {
    const ta = view.textarea;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === "Backspace" && plain && !e.shiftKey && ta.selectionStart === ta.selectionEnd) {
      // In a line's leading spaces, go back a whole indent level at a time.
      const cut = backspaceDedent(ta.value, ta.selectionStart);
      if (!cut) return;
      e.preventDefault();
      ta.setRangeText("", cut.from, cut.to, "end");
      ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Tab" && e.shiftKey && plain) {
      // Shift+Tab takes one indent level off the cursor's line.
      e.preventDefault();
      const cut = lineDedent(ta.value, ta.selectionStart);
      if (!cut) return;
      const s = Math.max(cut.from, ta.selectionStart - (cut.to - cut.from));
      const end = Math.max(cut.from, ta.selectionEnd - (cut.to - cut.from));
      ta.setRangeText("", cut.from, cut.to);
      ta.setSelectionRange(s, end);
      ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end");
      view.data.code = ta.value;
      this.save();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.onRun(view.data.name);
    } else if (e.key === "Enter") {
      // Keep the current line's indentation, and indent after a colon.
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
      const line = ta.value.slice(lineStart, s);
      let indent = line.match(/^\s*/)[0];
      if (line.trimEnd().endsWith(":")) indent += "    ";
      e.preventDefault();
      ta.setRangeText("\n" + indent, s, ta.selectionEnd, "end");
      view.data.code = ta.value;
      this.save();
    }
  }

  // ---- Window actions ----

  // Bring a window to the front (later in the desk = on top) and make it active.
  focus(name, focusEditor = true) {
    const view = this.views.get(name);
    if (!view) return;
    const list = this.workspace.windows;
    const changed = this.workspace.active !== name || list[list.length - 1] !== view.data;
    if (view.data.hidden) {
      view.data.hidden = false;
      this.clamp(view);
    }
    if (changed) {
      list.splice(list.indexOf(view.data), 1);
      list.push(view.data);
      this.workspace.active = name;
      this.focusOrder();
      this.renderBar();
      this.save();
    }
    this.updateView(view);
    if (focusEditor) view.textarea.focus();
  }

  focusOrder() {
    const list = this.workspace.windows;
    list.forEach((w, i) => {
      const view = this.views.get(w.name);
      // A window with a marked line stays on top until the mark goes.
      view.el.style.zIndex = String(this.marked?.name === w.name ? list.length + 1 : i + 1);
      this.updateView(view);
    });
  }

  hide(name) {
    if (!this.tools) return;
    const view = this.views.get(name);
    view.data.hidden = true;
    // The next visible window on top becomes active.
    const visible = this.workspace.windows.filter((w) => !w.hidden);
    if (this.workspace.active === name && visible.length) {
      this.workspace.active = visible[visible.length - 1].name;
    }
    this.focusOrder();
    this.renderBar();
    this.save();
  }

  askDelete(view) {
    if (!this.tools) return;
    if (this.views.size === 1) {
      this.onMessage("You need at least one code window, so this one can't be deleted.", "note");
      return;
    }
    view.confirm.querySelector("span").textContent = `Delete ${view.data.name} and all its code?`;
    view.confirm.hidden = false;
  }

  remove(name) {
    const view = this.views.get(name);
    view.el.remove();
    this.views.delete(name);
    const list = this.workspace.windows;
    list.splice(list.indexOf(view.data), 1);
    if (this.workspace.active === name) {
      const visible = list.filter((w) => !w.hidden);
      this.workspace.active = (visible[visible.length - 1] ?? list[list.length - 1]).name;
    }
    this.focusOrder();
    this.renderBar();
    this.save();
    this.onMessage(`Deleted the ${name} window.`, "note");
  }

  // Open the window `name` with `code` and bring it to the front. If it's
  // already there, it keeps its code, unless `fresh` puts `code` back.
  openWindow(name, code, fresh = false) {
    let view = this.views.get(name);
    if (!view) {
      const data = newWindow(name, code, this.views.size % 6);
      this.workspace.windows.push(data);
      view = this.addView(data);
      this.clamp(view);
    } else if (fresh) {
      view.data.code = code;
      view.textarea.value = code;
    }
    this.focus(name, false);
    this.save();
  }

  create() {
    const name = nextName(this.names());
    const code = `# Write commands here with define.\n# Then write  use ${name}  in another window to use them.\n\n`;
    const data = newWindow(name, code, this.views.size % 6);
    this.workspace.windows.push(data);
    const view = this.addView(data);
    this.clamp(view);
    this.focus(name, false);
    this.startRename(view);
  }

  startRename(view) {
    if (!this.tools || view.el.querySelector(".win-name-input")) return;
    const input = document.createElement("input");
    input.className = "win-name-input";
    input.value = view.data.name;
    input.maxLength = 40;
    input.setAttribute("aria-label", "Window name");
    view.nameEl.hidden = true;
    view.nameEl.after(input);
    input.focus();
    input.select();
    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      input.remove();
      view.nameEl.hidden = false;
      if (commit) this.rename(view, input.value);
      view.textarea.focus();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  rename(view, text) {
    const old = view.data.name;
    const name = normalizeName(text);
    if (name === old) return;
    const problem = nameProblem(name, this.names().filter((n) => n !== old));
    if (problem) {
      this.onMessage(problem, "error");
      return;
    }
    view.data.name = name;
    this.views.delete(old);
    this.views.set(name, view);
    if (this.workspace.active === old) this.workspace.active = name;
    if (this.runningName === old) this.runningName = name;
    if (this.marked?.name === old) this.marked.name = name;
    this.updateView(view);
    this.renderBar();
    this.save();
    const users = this.workspace.windows.filter((w) =>
      new RegExp(`^\\s*(use\\b.*\\b|from\\s+|import\\s+)${old}\\b`, "m").test(w.code),
    );
    if (users.length) {
      const list = users.map((w) => w.name).join(", ");
      this.onMessage(`Renamed ${old} to ${name}. Remember to change "use ${old}" in ${list}.`, "note");
    }
  }

  // ---- The bar of window chips above the desk ----

  renderBar() {
    this.bar.textContent = "";
    // One window and nothing to make: no chips needed.
    this.bar.hidden = !this.tools && this.workspace.windows.length === 1;
    for (const w of [...this.workspace.windows].sort((a, b) => a.name.localeCompare(b.name))) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.name = w.name;
      chip.textContent = w.name;
      chip.title = w.hidden ? `Show ${w.name}` : `Bring ${w.name} to the front`;
      chip.classList.toggle("is-hidden", w.hidden);
      chip.classList.toggle("active", w.name === this.active && !w.hidden);
      chip.classList.toggle("running", w.name === this.runningName);
      chip.classList.toggle("has-mark", w.name === this.marked?.name);
      chip.addEventListener("click", () => this.focus(w.name));
      this.bar.append(chip);
    }
    const allHidden = this.workspace.windows.every((w) => w.hidden);
    this.desk.classList.toggle("empty", allHidden);
    if (!this.tools) return;
    const add = document.createElement("button");
    add.type = "button";
    add.className = "chip add";
    add.textContent = "+ New window";
    add.addEventListener("click", () => this.create());
    this.bar.append(add);
  }
}
