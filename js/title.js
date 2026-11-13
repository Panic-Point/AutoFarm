// The title screen's choices: Continue, New game and Replay a chapter.
// No DOM code here, so it can be tested with Node.
import { CHAPTERS, chapterOf, findQuest } from "./chapters.js";
import { findContract } from "./postgame.js";
import { isChapterDone, totalStars } from "./progress.js";

// Is there anything a new game would erase? Stars, ribbons, shop items or
// produce in the barn all count.
export function hasSave(p, barn = {}) {
  return totalStars(p) > 0
    || p.contracts.length > 0
    || p.owned.length > 1
    || Object.values(barn).some((n) => n > 0);
}

// Where Continue picks up: "Chapter 3 · Quest 3-2: Berry Friends".
export function continueText(mode) {
  const quest = mode?.quest ? findQuest(mode.quest) : null;
  if (quest?.golden) return `After the Festival · ${quest.title}`;
  if (quest?.festival) return `Festival Day · ${quest.title}`;
  if (quest) {
    const where = mode.replay ? `Replaying chapter ${mode.replay}` : `Chapter ${chapterOf(quest.id).n}`;
    return `${where} · Quest ${quest.id}: ${quest.title}`;
  }
  const contract = mode?.contract ? findContract(mode.contract) : null;
  if (contract) return `Home farm · ${contract.title ?? `${contract.who}'s order`}`;
  return "Your home farm";
}

// Chapters that can be played again: the finished ones.
export function replayChapters(p) {
  return CHAPTERS.filter((ch) => isChapterDone(p, ch.n));
}

// The quest after `id` when replaying chapter `n`, bonus quests included, or
// null at the end of the chapter.
export function replayNext(n, id) {
  const list = CHAPTERS[n - 1]?.quests ?? [];
  const i = list.findIndex((q) => q.id === id);
  return i >= 0 && i + 1 < list.length ? list[i + 1].id : null;
}
