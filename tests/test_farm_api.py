"""Tests the Python API and sandbox with a fake _farm module (plain CPython)."""
import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "py"))

calls = []
fake = types.ModuleType("_farm")
state = {"budget": 10**9, "x": 0}

def _action(name):
    def f(*args):
        calls.append((name, args))
        if state["budget"] <= 0:
            return -1
        state["budget"] -= 1
        return 1
    return f

for n in ("move", "till", "plant", "harvest", "wait"):
    setattr(fake, n, _action(n))
fake.is_ripe = lambda: True
fake.crop_here = lambda: "grass"
fake.ground_here = lambda: "grass"
fake.pos_x = lambda: state["x"]
fake.pos_y = lambda: 0
fake.field_size = lambda: 4
fake.count = lambda item: 0
fake.ticks = lambda: 0
fake.can_move = lambda d: True
fake.plot_data = lambda key: '[1, 2]' if key == "rows" else "null"
state["seeds"] = None
fake.has_seed = lambda c: state["seeds"] is None or c in state["seeds"]
logs = []
fake.log = logs.append
at = []
fake.at = lambda name, line: at.append((name, line))
sys.modules["_farm"] = fake

import farm_api  # noqa: E402


class FarmApiTest(unittest.TestCase):
    def setUp(self):
        calls.clear()
        logs.clear()
        at.clear()
        state["budget"] = 10**9

    def test_loops_and_ifs(self):
        code = (
            "for i in range(field_size()):\n"
            "    if is_ripe():\n"
            "        harvest()\n"
            "    move(EAST)\n"
            "n = 0\n"
            "while n < 2:\n"
            "    n += 1\n"
            "print('done', n)\n"
        )
        self.assertEqual(farm_api.run(code), ["ok", "Program finished."])
        self.assertEqual(len(calls), 8)
        self.assertEqual(logs, ["done 2"])

    def test_functions_and_classes_work(self):
        code = (
            "class Plan:\n"
            "    def __init__(self, n):\n"
            "        self.n = n\n"
            "def go(p):\n"
            "    for _ in range(p.n):\n"
            "        move(NORTH)\n"
            "go(Plan(3))\n"
        )
        self.assertEqual(farm_api.run(code)[0], "ok")
        self.assertEqual(len(calls), 3)

    def test_error_reports_line(self):
        status, msg = farm_api.run("move(NORTH)\nplant('potato')\n")
        self.assertEqual(status, "error")
        self.assertTrue(msg.startswith("Line 2: ValueError"), msg)

    def test_syntax_error(self):
        status, msg = farm_api.run("for x in range(3)\n    pass\n")
        self.assertEqual(status, "error")
        self.assertIn("Line 1", msg)

    def test_out_of_ticks_cannot_be_swallowed(self):
        state["budget"] = 5
        code = "while True:\n    try:\n        wait()\n    except Exception:\n        pass\n"
        self.assertEqual(farm_api.run(code)[0], "out_of_ticks")

    def test_runaway_loop_stopped(self):
        status, msg = farm_api.run("while True:\n    pass\n")
        self.assertEqual(status, "too_many_steps")
        self.assertIn("line", msg)

    def test_sandbox_blocks_import_and_dunders(self):
        for code in ("import os", "from js import document", "x = ().__class__", "use os",
                     "__import__('os')"):
            status, msg = farm_api.run(code)
            self.assertEqual(status, "error", code)
            self.assertIn("not available", msg)
        status, msg = farm_api.run("open('x')")
        self.assertEqual(status, "error")
        self.assertIn("NameError", msg)


class PlainWordsTest(unittest.TestCase):
    def setUp(self):
        calls.clear()
        logs.clear()
        state["budget"] = 10**9

    def run_ok(self, code):
        result = farm_api.run(code)
        self.assertEqual(result, ["ok", "Program finished."], code)

    def test_repeat_times(self):
        self.run_ok("repeat 3 times:\n    move(EAST)\n")
        self.assertEqual(len(calls), 3)

    def test_for_amount_times(self):
        self.run_ok("amount = 2\nfor amount times:\n    wait()\nfor field_size() times:  # whole row\n    wait()\n")
        self.assertEqual(len(calls), 6)

    def test_nested_repeat(self):
        self.run_ok("repeat 2 times:\n    repeat 3 times:\n        wait()\n")
        self.assertEqual(len(calls), 6)

    def test_repeat_forever_and_until(self):
        state["budget"] = 4
        self.assertEqual(farm_api.run("repeat forever:\n    wait()\n")[0], "out_of_ticks")
        self.run_ok("set n to 0\nrepeat until n == 5:\n    change n by 1\nprint(n)\n")
        self.assertEqual(logs, ["5"])

    def test_repeat_while(self):
        self.run_ok("set n to 3\nrepeat while n > 0:\n    change n by -1\n    wait()\n")
        self.assertEqual(len(calls), 3)

    def test_count_from_to(self):
        self.run_ok("for x from 1 to 3:\n    print(x)\nfor x from 2 to 0:\n    print(x)\n")
        self.assertEqual(logs, ["1", "2", "3", "2", "1", "0"])

    def test_for_each(self):
        self.run_ok("for each crop in ['a', 'b']:\n    print(crop)\n")
        self.assertEqual(logs, ["a", "b"])

    def test_else_if_and_true_false(self):
        self.run_ok("set n to 2\nif n == 1:\n    print('one')\nelse if n == 2:\n    print('two')\nelse:\n    print('many')\nprint(true, false)\n")
        self.assertEqual(logs, ["two", "True False"])

    def test_define(self):
        self.run_ok("define step:\n    move(EAST)\ndefine go(n):\n    repeat n times:\n        step()\ngo(4)\n")
        self.assertEqual(len(calls), 4)

    def test_python_still_works_and_words_in_strings_untouched(self):
        self.run_ok('for i in range(2):\n    wait()\nnote = """\nrepeat 5 times:\n"""\nprint(note.strip())\nset_x = 1\n')
        self.assertEqual(logs, ["repeat 5 times:"])
        self.assertEqual(len(calls), 2)

    def test_line_numbers_point_at_player_code(self):
        status, msg = farm_api.run("repeat 2 times:\n    wait()\nplant('potato')\n")
        self.assertTrue(msg.startswith("Line 3: ValueError"), msg)

    def test_friendly_errors(self):
        cases = {
            "repeat 5 times\n    wait()\n": "Line 1: add a colon",
            "wait()\nrepeat:\n    wait()\n": "Line 2: I don't understand",
            "set x = 5\n": "Try `set total to 0`",
            "repeat 2.5 times:\n    wait()\n": "whole number",
            "repeat 'lots' times:\n    wait()\n": "needs a number",
        }
        for code, expected in cases.items():
            status, msg = farm_api.run(code)
            self.assertEqual(status, "error", code)
            self.assertIn(expected, msg, code)


class CodeWindowsTest(unittest.TestCase):
    """Programs split across several named code windows."""

    HELPER = (
        "define step(n):\n"
        "    repeat n times:\n"
        "        move(EAST)\n"
        "class Counter:\n"
        "    def __init__(self):\n"
        "        self.total = 0\n"
        "    def add(self):\n"
        "        self.total += 1\n"
        "_secret = 1\n"
    )

    def setUp(self):
        calls.clear()
        logs.clear()
        state["budget"] = 10**9

    def run_ok(self, code, files, name="main"):
        result = farm_api.run(code, files, name)
        self.assertEqual(result, ["ok", "Program finished."], code)

    def test_use_plain_words(self):
        self.run_ok("use helper\nstep(2)\nc = Counter()\nc.add()\nprint(c.total)\n",
                    {"helper": self.HELPER})
        self.assertEqual(len(calls), 2)
        self.assertEqual(logs, ["1"])

    def test_python_import_forms(self):
        files = {"helper": self.HELPER, "more": "def hi():\n    print('hi')\n"}
        self.run_ok("from helper import *\nimport more\nstep(1)\nmore.hi()\n", files)
        self.run_ok("use step from helper\nuse helper and more\nstep(1)\nhi()\n", files)
        self.run_ok("use helper, more\nhi()\n", files)
        self.assertEqual(logs, ["hi", "hi", "hi"])

    def test_files_passed_as_json(self):
        import json
        self.run_ok("use helper\nstep(3)\n", json.dumps({"helper": self.HELPER}))
        self.assertEqual(len(calls), 3)

    def test_star_import_skips_private_names(self):
        status, msg = farm_api.run("use helper\nprint(_secret)\n", {"helper": self.HELPER})
        self.assertEqual(status, "error")
        self.assertIn("NameError", msg)

    def test_window_runs_once_and_chains(self):
        files = {
            "a": "print('loading a')\ndefine go:\n    move(NORTH)\n",
            "b": "use a\ndefine go_twice:\n    go()\n    go()\n",
        }
        self.run_ok("use a\nuse b\ngo_twice()\n", files)
        self.assertEqual(logs, ["loading a"])
        self.assertEqual(len(calls), 2)

    def test_any_window_can_be_run(self):
        self.run_ok("use helper\nstep(1)\n", {"helper": self.HELPER, "main": "this is not code"}, name="crops")
        self.assertEqual(len(calls), 1)

    def test_errors_name_the_window(self):
        helper = "define boom:\n    wait()\n    plant('potato')\n"
        status, msg = farm_api.run("use helper\nboom()\n", {"helper": helper})
        self.assertEqual(status, "error")
        self.assertTrue(msg.startswith("In helper, line 3: ValueError"), msg)

        status, msg = farm_api.run("use helper\n", {"helper": "repeat 3 times\n    wait()\n"})
        self.assertTrue(msg.startswith("In helper, line 1: add a colon"), msg)

        status, msg = farm_api.run("use helper\n", {"helper": "x = (\n"})
        self.assertTrue(msg.startswith("In helper, line"), msg)

        status, msg = farm_api.run("use helper\n", {"helper": "import os\n"})
        self.assertIn("In helper, line 1: os is not available", msg)

    def test_missing_window(self):
        status, msg = farm_api.run("use helpr\n", {"helper": ""})
        self.assertEqual(status, "error")
        self.assertIn("Line 1: helpr is not available", msg)

    def test_circular_use(self):
        files = {"a": "use b\n", "b": "use a\n"}
        status, msg = farm_api.run("use a\n", files)
        self.assertEqual(status, "error")
        self.assertIn("circle (a -> b -> a)", msg)

    def test_runaway_loop_in_other_window(self):
        status, msg = farm_api.run("use helper\nspin()\n", {"helper": "define spin:\n    repeat forever:\n        pass\n"})
        self.assertEqual(status, "too_many_steps")
        self.assertIn("around line 3 of helper", msg)

    def test_use_hint(self):
        status, msg = farm_api.run("use helper.py\n", {"helper": ""})
        self.assertEqual(status, "error")
        self.assertIn("Try `use helper`", msg)


class WordsTest(unittest.TestCase):
    """Finding coding words, and keeping the ones Bolt hasn't learned locked."""

    def setUp(self):
        calls.clear()
        logs.clear()
        state["budget"] = 10**9
        state["seeds"] = None

    def words(self, code, files=None):
        status, msg = farm_api.run(code, files)
        self.assertEqual(status, "ok", msg)
        return farm_api.used_words()

    def test_plain_words_and_python_are_the_same_word(self):
        self.assertEqual(self.words("repeat 2 times:\n    move(EAST)\n"), ["move", "repeat"])
        self.assertEqual(self.words("repeat until is_ripe():\n    wait()\n"), ["is_ripe", "repeat_until", "wait"])
        self.assertEqual(self.words("while not is_ripe():\n    wait()\n"), ["is_ripe", "repeat_while", "wait"])
        self.assertEqual(self.words("set n to 1\nchange n by 1\n"), ["variables"])
        self.assertEqual(self.words("n = 1\n"), ["variables"])
        self.assertEqual(self.words("for x from 1 to 2:\n    pass\nfor i in range(2):\n    pass\n"), ["count_from"])
        self.assertEqual(self.words("for each c in [1]:\n    pass\n"), ["lists"])

    def test_loop_inside_loop(self):
        self.assertIn("nested", self.words("repeat 2 times:\n    repeat 2 times:\n        wait()\n"))
        # A loop inside a command isn't inside the loop that calls the command.
        used = self.words("define row:\n    repeat 2 times:\n        wait()\nrepeat 2 times:\n    row()\n")
        self.assertNotIn("nested", used)
        self.assertIn("define", used)

    def test_words_in_other_windows_count(self):
        used = self.words("use helper\ngo()\n", {"helper": "define go:\n    if is_ripe():\n        harvest()\n"})
        self.assertEqual(used, ["define", "harvest", "if", "is_ripe", "use"])

    def test_locked_word_stops_the_run(self):
        locked = {"repeat": "Bolt doesn't know repeat yet. You'll learn it in chapter 2!"}
        status, msg = farm_api.run("move(EAST)\nrepeat 2 times:\n    harvest()\n", None, "main", locked)
        self.assertEqual(status, "error")
        self.assertEqual(msg, "Line 2: Bolt doesn't know repeat yet. You'll learn it in chapter 2!")
        self.assertEqual(calls, [], "nothing runs")

    def test_locked_word_in_another_window(self):
        import json
        locked = json.dumps({"if": "Bolt doesn't know if and else yet."})
        status, msg = farm_api.run("use helper\n", {"helper": "\nif true:\n    pass\n"}, "main", locked)
        self.assertEqual(msg, "In helper, line 2: Bolt doesn't know if and else yet.")

    def test_advanced_python(self):
        self.assertIn("advanced", self.words("class A:\n    pass\n"))
        self.assertIn("advanced", self.words("f = lambda: 1\n"))
        self.assertNotIn("advanced", self.words("print(f'{1}')\n"))

    def test_seeds_and_can_move(self):
        state["seeds"] = ["grass"]
        status, msg = farm_api.run("plant(Crop.CARROT)\n")
        self.assertEqual(msg, "Line 1: Bolt has no carrot seeds yet. You can buy them in the shop.")
        self.assertEqual(self.words("print(can_move(NORTH))\n"), ["can_move"])
        self.assertEqual(logs, ["True"])


    def test_new_crops(self):
        self.assertEqual(farm_api.run("plant(Crop.LETTUCE)\nplant(Crop.STRAWBERRY)\nplant(Crop.BLUEBERRY)\n"),
                         ["ok", "Program finished."])
        self.assertEqual([c for c in calls if c[0] == "plant"],
                         [("plant", ("lettuce",)), ("plant", ("strawberry",)), ("plant", ("blueberry",))])
        status, msg = farm_api.run("print(count('blueberry'))\ncount('apple')\n")
        self.assertEqual(logs, ["0"])
        self.assertIn("'lettuce', 'strawberry' or 'blueberry'", msg)
        status, msg = farm_api.run("plant('apple')\n")
        self.assertIn("Crop.LETTUCE, Crop.STRAWBERRY or Crop.BLUEBERRY", msg)

    def test_missing_brackets(self):
        cases = {
            "move(EAST)\nharvest\n": "Line 2: `harvest` needs brackets to work. Write `harvest()` so Bolt knows to do it.",
            "if is_ripe:\n    harvest()\n": "Line 1: `is_ripe` needs brackets to check. Write `is_ripe()`. "
                "Without them Bolt doesn't look, and always thinks the answer is yes!",
            "repeat until is_ripe:\n    wait()\n": "Line 1: `is_ripe` needs brackets. Write `is_ripe()`. "
                "Without them Bolt doesn't look, and gets the wrong answer.",
            "while can_move:\n    move(EAST)\n": "Line 1: `can_move` needs brackets to check. Write `can_move(EAST)`. "
                "Without them Bolt doesn't look, and always thinks the answer is yes!",
            "repeat field_size times:\n    move(EAST)\n": "Line 1: `field_size` needs brackets. Write `field_size()`. "
                "Without them Bolt doesn't look, and gets the wrong answer.",
            "define go:\n    move(EAST)\ngo\n": "Line 3: `go` needs brackets to work. Write `go()` so Bolt knows to do it.",
            "move EAST\n": "Line 1: `move` needs brackets around what goes in it. Write `move(EAST)`.",
            "plant Crop.WHEAT\n": "Line 1: `plant` needs brackets around what goes in it. Write `plant(Crop.WHEAT)`.",
        }
        for code, expected in cases.items():
            status, msg = farm_api.run(code)
            self.assertEqual((status, msg), ("error", expected), code)
        self.assertEqual(calls, [])  # nothing ran
        # A command from another window, used without brackets.
        status, msg = farm_api.run("use helper\nsweep\n", {"helper": "define sweep:\n    move(EAST)\n"})
        self.assertIn("`sweep` needs brackets", msg)
        self.assertEqual(farm_api.error_line(), ["main", 2])
        status, msg = farm_api.run("use helper\n", {"helper": "\nharvest\n"})
        self.assertTrue(msg.startswith("In helper, line 2: `harvest` needs brackets"), msg)
        self.assertEqual(farm_api.error_line(), ["helper", 2])

    def test_brackets_check_leaves_good_code_alone(self):
        ok = [
            "if is_ripe():\n    harvest()\n",
            "set move to 3\nprint(move)\n",  # a variable that happens to be called move
            "define go(harvest):\n    print(harvest)\ngo(1)\n",
            "jobs = [harvest, wait]\nfor each job in jobs:\n    job()\n",
            "repeat field_size() times:\n    move(EAST)\n",
        ]
        for code in ok:
            self.assertEqual(farm_api.run(code)[0], "ok", code)

    def test_reports_running_line(self):
        code = "define go:\n    move(EAST)\n\ngo()\nharvest()\n"
        at.clear()
        farm_api.run(code)
        self.assertEqual(at, [("main", 2), ("main", 5)])
        at.clear()
        farm_api.run("use helper\ngo()\nwait()\n", {"helper": "define go:\n    till()\n"})
        self.assertEqual(at, [("helper", 2), ("main", 3)])

    def test_error_line(self):
        farm_api.run("move(EAST)\nplant('potato')\n")
        self.assertEqual(farm_api.error_line(), ["main", 2])
        farm_api.run("move(EAST)\n")
        self.assertEqual(farm_api.error_line(), [])
        farm_api.run("repeat 3:\n    move(EAST)\n")
        self.assertEqual(farm_api.error_line(), ["main", 1])

    def test_plot_data(self):
        self.assertEqual(farm_api._plot_data("rows"), [1, 2])
        self.assertIsNone(farm_api._plot_data("nothing"))


if __name__ == "__main__":
    unittest.main()
