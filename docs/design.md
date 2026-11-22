# Game design

How AutoFarm is put together as a game: the chapters and quests, the crops and their rules, the plain-word code players write, and code windows. For how the code is laid out, see [How it works](how-it-works.md), and for each chapter in turn, the [Chapter guide](chapters.md). Quests themselves are data in [`js/chapters.js`](../js/chapters.js) (the comment at the top describes every quest field) and [`js/postgame.js`](../js/postgame.js).

## Chapters, quests and stars

The game is 8 chapters at Willow Creek Farm, and each one teaches one coding idea through short quests from a neighbor:

| # | Chapter | Bolt learns |
| --- | --- | --- |
| 1 | First Steps | `move`, `harvest` |
| 2 | Do It Again | `repeat 5 times:` (plus `till`, `plant`, `wait`) |
| 3 | Loops in Loops | a repeat inside a repeat |
| 4 | Look Before You Act | `if` / `else` / `else if`, `is_ripe()`, `ground_here()` |
| 5 | Until It's Done | `repeat until`, `repeat while`, `repeat forever` and `break`, `can_move()` |
| 6 | Keeping Count | `set` / `change`, `count()`, `for x from 1 to 5:`, `and` / `or` / `not` |
| 7 | Teach Bolt | `define`, `use helper`, `give back` |
| 8 | Big Farm Plans | lists and `for each`, ending with Festival Day |

- **The title screen** opens with the page, and the **Title** button brings it back. **Continue** picks up the quest, contract or home farm you were on. **New game** asks first when there's anything to lose, then erases stars, the barn, shop items and code windows and starts at quest 1-1. **Replay a chapter** lists the finished chapters: picking one starts its first quest, and Next goes through every quest in it, bonus ones too. Stars are only ever raised, so replaying can't lose any.
- **Quests** run on their own field, which starts over on every try. Finishing a quest gives 1 star; finishing within a tick (cycle) limit gives 2, and within a tighter one 3. Quests in a chapter open one after another.
- **Chapters** open when the one before is finished and you have enough stars.
- **Locked words:** a coding word stays locked until its chapter opens. Using it early stops the run with a note like "Bolt doesn't know repeat yet. You'll learn it in chapter 2!". Every way of writing an idea unlocks together: `for _ in range(5):` is `repeat` (chapter 2) when the loop doesn't use its variable, and `for i in range(...)` that does is `for ... from ... to` (chapter 6); `==`, `<` and the other comparisons open with `if` in chapter 4; and `in`, `len()`, `reversed()` and list comprehensions open with lists in chapter 8. The [Chapter guide](chapters.md) lists every form. Anything no chapter teaches (classes, lambdas, try...) opens after the festival.
- **Lessons:** the first time a quest needs a new coding word, a card shows what it does, every way of writing it (plain words and Python side by side) and a short example on its own little field, with a **Watch Bolt do it** button that plays it. The example never solves the quest. The quest card's **What's new** button shows the card again.
- **The Farm Book** (in the header) has a page for every command, idea and crop the player has opened: what it does, what it gives back, every way to write it, things to watch out for, the example, and the quest where it was learned, with a button to play it. Pages open with their chapter (crops when you first meet them), new ones are marked until read, and practice mode opens them all. Group tips (like how to drag a code window) show under "Good to know" on each page in that group.
- **Missing brackets:** a command written without its brackets, like `harvest` on its own, `if is_ripe:` (always yes, so Bolt picks unripe crops) or `move EAST`, stops the run before it starts with a hint like "`is_ripe` needs brackets to check. Write `is_ripe()`." Commands you `define` count too, in any window.
- **Following along:** while Bolt runs, the line doing each action lights up, in whichever code window it's in, and that window comes to the front. When a run stops on a problem, its line turns red until you change the code.
- **Test plots:** a quest can have 2 or 3 fields, and the same program runs on each in turn, so counting exact steps stops working and the program has to look around. The run stops at the first plot that fails, with a note like "Your program worked on plot 1, but not on plot 2.", and the star targets count the ticks of every plot together. The quest card shows each plot, and clicking one shows it on the field.
- **Fix Bolt's code:** a quest can start with a program that almost works. It opens in its own code window, and **Put Bolt's code back** restores it.
- **Finished chapters stay finished.** Once every core quest in a chapter has a star, the save remembers it, so a quest added to that chapter later is new but never locks anything. Saves carry a version, and `js/progress.js` moves older saves forward when quests change.
- **Festival Day** ends chapter 8 with three events on test plots, each judged by a neighbor: The Big Basket (8-5, Daisy and Hazel: pick every ripe crop on two plot sizes, lettuce first), The Fog Race (8-6, Wren: find a carrot hidden somewhere new in the fog and bring it home), and The Grand Display (8-7, Aunt Juniper: plant the rows `design()` gives, different on each plot). A banner names each event as it starts. Finishing all three plays the festival: each neighbor gives Bolt a ribbon for what was learned, Aunt Juniper gives the festival crown, and the barn shows the season's harvest. It can be watched again from the shelf.
- **Golden crowns:** every finished chapter gives a free golden crown with its chapter's crop on it, from the Hay Crown to the Festival Crown. Bolt can wear any of them, and the shelf shows the set.
- **What's next:** after the festival, Next never sends players back to the start. It picks a new quest, then a bonus quest not tried yet, then the quest with the fewest stars, and says why ("Pip's Garden has 1 star. Can you get 3?").
- **After the festival** the map gets a ninth page, Willow Creek After the Festival, with two things to do:
  - **Golden quests**, one per chapter (G-1 to G-8): an old quest's idea on 2 or 3 test plots, like the first row in three lengths or the Mayor's order on three market days. Each gives a golden star (they don't count toward chapter stars) and a trophy on the shelf.
  - **The contract board:** 12 orders from the neighbors, 3 on the board at a time, filled on the home farm with your own seeds within a tick budget ("20 lettuce and 10 strawberries in 300 ticks"). Each gives a ribbon and opens a thank-you in the shop. Daisy's dinner time has Daisy wait at the barn: Bolt has to visit her at least every 20 ticks while farming. Hazel's strawberry order opens the bee hive, which sits in the middle of the home farm: strawberries and blueberries within 1 tile of it give 1 more.
- **The home farm** is free play. Everything harvested, in quests too, goes to the barn, and the shop sells field upgrades, seeds, hats for Bolt and farm decorations for produce. Each finished chapter puts new things in the shop and a badge on the shelf. The shelf also has the almanac (a page per crop) and titles.
- **For grown-ups:** the shelf has a practice mode that opens every chapter and word, and a button to start progress over. For testing, opening the game with `?testing` at the end of the address (for example `index.html?testing`) also shows an **Unlock everything** button there: it finishes every chapter and gives every shop item, crop, crown, almanac page and Farm Book page, without changing stars or contracts. Players never see it.

## Crops

| Crop | Costs | Ripe after | Gives | Special rule |
| --- | --- | --- | --- | --- |
| Grass | free | 4 ticks | 1 hay | Grows back by itself. |
| Wheat | free | 8 ticks | 1 wheat | |
| Carrot | 2 wheat | 14 ticks | 1, or 2 after wheat | **Crop swap:** planted on soil where wheat was just picked, it gives 2. A *take-turns puzzle*: a field has to swap between wheat and carrots, so the program has to know what comes next. |
| Strawberry | 3 wheat | 12 ticks | 1 + 1 per friend | **Friends:** when it ripens it counts the strawberries right next to it, and gives 1 more for each. A *layout puzzle*: 4 in a row make 10, a 2 by 2 square makes 12, and picking one before its neighbours ripen leaves them fewer friends. |
| Lettuce | 2 hay | 6 ticks | 1 lettuce | **Wilts:** it stays crisp for 8 ticks, then wilts and gives nothing. A *scheduling puzzle*: first planted, first picked, so the order Bolt walks matters (a queue). |
| Blueberry | 2 carrots | 24 ticks | 2, 3, 4, 5, 5... | **Bush:** stays after a ripe harvest and is ripe again 10 ticks later, giving 1 more each time up to 5. Picking it early loses the whole bush. A *keep-it-running puzzle*: a patrol loop with `repeat until count(...)` beats replanting. |
| Pumpkin | 1 carrot | 16 ticks | 1 pumpkin | **Rots:** 30 ticks after it's ripe it rots. A rotten pumpkin can't be picked, and `till()` clears it (`is_rotten()` checks). A *three-way choice*: ripe → pick, rotten → till, young → leave it, with `else if`. |
| Mushroom | can't be planted | | 1 mushroom | **Wild:** grows by itself in the fog, in a different spot on each test plot. A *search puzzle*: `repeat forever` until you find it, then `break`. |
| Corn | 1 wheat | 10 wet ticks | 2 corn | **Thirsty:** only grows while its soil is wet. `water()` wets a tile for 6 ticks and uses 1 drop of the 5 in the can, and `refill()` fills it at the well. Water on wet soil, ripe corn or nothing is wasted. A *both-things-true puzzle*: `if is_dry() and not is_ripe():`. |
| Sunflower | 2 wheat | 40 ticks | 1 sunflower | **Tall:** Bolt can see it from anywhere, with `ripe_at(x, y)`. A *count-it-first puzzle*: a command that gives back how many are ripe in a row. |

Each special rule has a quest built around it (3-5 Berry Friends, 4-6 Crunchy Lettuce, 5-7 Wheat Then Carrots, 6-6 Two Old Bushes, 4-5 Pip's Pumpkin Patch, 5-6 Mushroom in the Fog, 6-5 Thirsty Corn, 7-4 Sunflower Rows), and the new seeds go in the shop after the chapter that fits them. The pumpkin, mushroom, corn and sunflower quests are core quests because they teach a coding word (`else if`, `break`, `and`/`or`/`not`, `give back`), and each has a harder bonus quest after it. Bonus quests give stars but aren't needed to finish a chapter. Chapter 8 opens with **The Mayor's Order** (8-4): `order()` gives a different list of crops on each test plot, and Bolt keeps a basket list with `add crop to basket` so it picks exactly one of each and stops when the basket is full. Chapters 1 to 4 each have at least one a bonus **Fix Bolt's code** quest (1-6, 2-6, 3-6, 3-11, 4-11) that starts with a program that almost works. Chapters 3 and 4 also have five extra **challenge** bonus quests each (3-7 to 3-11 and 4-8 to 4-12) that mix the chapter's new idea with everything learned before it: back-and-forth timing with regrowing grass, a berry patch picked in planting order, an exact 12-wheat order, carrots traded for pumpkin seeds, lettuce replanted as it's picked, and a three-plot garden tidy-up.

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
| `give back total` | `return total` |
| `add crop to basket` | `basket.append(crop)` |

Crops are written by name, like directions: `plant(WHEAT)`, `crop_here() == MUSHROOM`, `count(CARROT)` (`count(GRASS)` counts hay). `Crop.WHEAT` works too, and `ground_here()` gives back `GRASS` or `SOIL`.

## Code windows

Code can be split across several named windows, like files. Make one with **+ New window**, drag windows around by their title bar, and double-click a name to rename it. Any window can use the commands and classes another window makes:

```
use helper                  # everything from the helper window
use helper, crops           # two windows at once
use go_home from helper     # just one command
```

Python's `from helper import *` and `import helper` work too. Every window has its own run button, and **Run** at the top runs the window used last. A window you use runs once per run, the first time it's used, and an error inside it says which window and line it came from. Windows can't import anything except each other.

**A fresh start for every quest.** When the player moves to a different quest, the main window starts with just a comment, like `# Write Bolt's program for "Up the Hill" here.`, so the last quest's program isn't mistaken for a hint. Fix-the-code quests still open their starter code in its own window. The code that was in main is kept as that quest's code from last time: playing the quest again shows **↩ My code from last time**, which swaps it back into main. Saves from before fresh starts keep their code until the next new quest.

**Keeping code.** The reward card offers **💾 Save this code in its own window**, which copies the winning program into a hidden window named after the quest (like `up_the_hill`). It waits in the window bar until the player picks it, and it only runs if another window uses it. Every window's title bar also has a **💾** button that saves its code in the **Library**: it asks for a short name (the quest title for main, else the window name) and asks "Replace it?" before writing over a piece with the same name. **📚 Library**, next to **+ New window**, lists each piece with the quest it came from and its first lines. From there a piece can be opened in a new window, inserted into the active window at the cursor (lined up with the cursor's indent, or on a new line below when the cursor is mid-line), renamed or deleted. The Library is saved in local storage (`autofarm.library`) and New game keeps it.

`py/plain_words.py` rewrites these lines into Python before the program runs, one line for one line, so error messages keep the player's line numbers. A line that starts like a plain-word statement but isn't written right gets a hint instead of a Python syntax error.
