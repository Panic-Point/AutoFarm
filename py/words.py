"""Finds which coding words a program uses, so the game can keep words locked
until the chapter that teaches them.

A "word" is an idea a chapter teaches, such as `repeat`, `if` or making your
own command with `define`. Plain words and the Python they stand for count as
the same word: `repeat until done:` and `while not done:` are both
"repeat_until". The game (js/words.js) decides which words are locked and what
Bolt says about them; this module only reports what a program uses.
"""

import ast

# Farm commands that are words of their own. `print` is always allowed.
API_WORDS = {
    "move", "harvest", "till", "plant", "wait", "water", "refill",
    "is_ripe", "is_rotten", "is_dry", "water_left", "ripe_at",
    "crop_here", "ground_here", "can_move", "position", "field_size",
    "count", "ticks", "order",
}

# Farm commands that belong to another command's word: the watering can's
# commands are all one word, "water".
_API_ALIASES = {"refill": "water", "is_dry": "water", "water_left": "water"}

# Plain-word line tags (from plain_words.translate) for loops.
_FOR_TAGS = {"repeat_times": "repeat", "for_times": "repeat", "count_from": "count_from", "for_each": "lists"}
_WHILE_TAGS = {"repeat_until", "repeat_while", "repeat_forever"}

# Built-in Python commands that belong to a word: they work on lists.
_LIST_BUILTINS = {"len", "reversed"}

# Python that no chapter teaches. It opens after the last chapter.
_ADVANCED = tuple(
    getattr(ast, name) for name in (
        "ClassDef", "Lambda", "Try", "TryStar", "With", "Global", "Nonlocal", "Dict", "Set",
        "SetComp", "DictComp", "GeneratorExp", "Yield", "YieldFrom", "Assert",
        "Delete", "AsyncFunctionDef", "Await", "NamedExpr", "Match",
    ) if hasattr(ast, name)
)


class _Finder(ast.NodeVisitor):
    def __init__(self, tags):
        self.tags = tags
        self.found = []
        self.loops = 0
        # `repeat until x:` becomes `while not (x):`, and `while not x:` means the
        # same, so that `not` is part of the loop, not the word for and/or/not.
        self.plain_not = set()

    def add(self, word, node):
        self.found.append((word, getattr(node, "lineno", 0)))

    def visit(self, node):
        if isinstance(node, _ADVANCED):
            self.add("advanced", node)
        return super().visit(node)

    def _loop(self, node, word):
        self.add(word, node)
        if self.loops:
            self.add("nested", node)
        self.loops += 1
        self.generic_visit(node)
        self.loops -= 1

    def visit_For(self, node):
        word = _FOR_TAGS.get(self.tags.get(node.lineno))
        if word is None:
            # Regular Python. `for i in range(5):` means `repeat 5 times:` when
            # the loop never looks at i. If it does, it counts like
            # `for x from 1 to 10:`. Anything else walks a list.
            it = node.iter
            is_range = isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == "range"
            if not is_range:
                word = "lists"
            elif _uses_target(node):
                word = "count_from"
            else:
                word = "repeat"
        self._loop(node, word)

    def visit_ListComp(self, node):
        # `[c for c in plan]` is a short way to write `for each c in plan:`.
        self.add("lists", node)
        self.generic_visit(node)

    def visit_Compare(self, node):
        # `crop in plan` and `crop not in plan` look inside a list. The others
        # (==, !=, <, >, <=, >=, is) compare two things.
        for op in node.ops:
            self.add("lists" if isinstance(op, (ast.In, ast.NotIn)) else "compare", node)
        self.generic_visit(node)

    def visit_While(self, node):
        if isinstance(node.test, ast.UnaryOp) and isinstance(node.test.op, ast.Not):
            self.plain_not.add(id(node.test))
        word = self.tags.get(node.lineno)
        if word not in _WHILE_TAGS:
            forever = isinstance(node.test, ast.Constant) and node.test.value is True
            word = "repeat_forever" if forever else "repeat_while"
        self._loop(node, word)

    def visit_FunctionDef(self, node):
        self.add("define", node)
        # A loop in a command is not inside the loop that calls the command.
        outer, self.loops = self.loops, 0
        self.generic_visit(node)
        self.loops = outer

    def visit_Return(self, node):
        self.add("define", node)
        self.add("give_back", node)
        self.generic_visit(node)

    def visit_If(self, node):
        self.add("if", node)
        # `elif` (or plain-word `else if`) is an If that is the whole else part,
        # written at the same indent. `else:` with an `if` inside it is not.
        if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
            inner = node.orelse[0]
            if inner.col_offset == node.col_offset or self.tags.get(inner.lineno) == "else_if":
                self.add("elif", inner)
        self.generic_visit(node)

    def visit_IfExp(self, node):
        self.add("if", node)
        self.generic_visit(node)

    def _logic(self, node):
        self.add("logic", node)
        self.generic_visit(node)

    visit_BoolOp = _logic

    def visit_UnaryOp(self, node):
        if isinstance(node.op, ast.Not) and id(node) not in self.plain_not:
            self.add("logic", node)
        self.generic_visit(node)

    def _variables(self, node):
        self.add("variables", node)
        self.generic_visit(node)

    visit_Assign = visit_AugAssign = visit_AnnAssign = _variables

    def visit_Import(self, node):
        self.add("use", node)

    visit_ImportFrom = visit_Import

    def _lists(self, node):
        self.add("lists", node)
        self.generic_visit(node)

    visit_List = visit_Subscript = _lists

    def _stop(self, node):
        self.add("stop", node)

    visit_Break = visit_Continue = _stop

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id in API_WORDS:
            self.add(_API_ALIASES.get(node.func.id, node.func.id), node)
        if isinstance(node.func, ast.Name) and node.func.id in _LIST_BUILTINS:
            self.add("lists", node)
        if isinstance(node.func, ast.Attribute) and node.func.attr == "append":
            self.add("add", node)
        self.generic_visit(node)


def _uses_target(node):
    """True if a for loop's body reads its loop variable (`for i in ...`)."""
    target = node.target
    if not isinstance(target, ast.Name):
        return True
    if target.id == "_":
        return False
    return any(
        isinstance(n, ast.Name) and n.id == target.id
        for part in node.body + node.orelse
        for n in ast.walk(part)
    )


def find_words(tree, tags=None):
    """[(word, line), ...] for every coding word in `tree`, in line order.
    `tags` is the {line: tag} dict that plain_words.translate filled in."""
    finder = _Finder(tags or {})
    finder.visit(tree)
    return sorted(finder.found, key=lambda item: item[1])
