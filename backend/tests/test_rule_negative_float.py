"""The negative-float rule (xer_checker/rules/negative_float.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import negative_float


def with_float(days):
    """A linked activity with this much float, in days."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=days)


def test_fails_below_0_days():
    assert negative_float.fails(with_float(-0.125))  # 1 hour late on an 8-hour calendar


def test_passes_at_0_days_or_with_a_blank_float():
    assert not negative_float.fails(with_float(0))
    assert not negative_float.fails(with_float(None))


def test_matches_dcma_4_7():
    assert (negative_float.NAME, negative_float.LIMIT, negative_float.DCMA_SECTION) == ("Negative float", 0, "4.7")
