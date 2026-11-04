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
logs = []
fake.log = logs.append
sys.modules["_farm"] = fake

import farm_api  # noqa: E402


class FarmApiTest(unittest.TestCase):
    def setUp(self):
        calls.clear()
        logs.clear()
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
        for code in ("import os", "from js import document", "x = ().__class__",
                     "__import__('os')"):
            status, msg = farm_api.run(code)
            self.assertEqual(status, "error", code)
            self.assertIn("not available", msg)
        status, msg = farm_api.run("open('x')")
        self.assertEqual(status, "error")
        self.assertIn("NameError", msg)


if __name__ == "__main__":
    unittest.main()
