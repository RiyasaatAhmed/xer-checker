"""The logic-loops rule (xer_checker/rules/logic_loops.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import logic_loops


def test_fails_on_a_loop_and_passes_off_one():
    assert logic_loops.fails(Activity("A1", True, True, 0, in_loop=True))
    assert not logic_loops.fails(Activity("A1", True, True, 0))


def test_any_loop_is_over_the_limit():
    assert logic_loops.LIMIT == 0 and logic_loops.SEVERITY == 3
