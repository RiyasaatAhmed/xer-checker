"""The high-float rule (xer_checker/rules/high_float.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import high_float


def with_float(days):
    """A linked activity with this much float, in days."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=days)


def test_fails_over_44_days():
    assert high_float.fails(with_float(44.125))  # 1 hour over, on an 8-hour calendar


def test_passes_at_exactly_44_days_or_with_a_blank_float():
    assert not high_float.fails(with_float(44))
    assert not high_float.fails(with_float(None))


def test_matches_dcma_4_6():
    assert (high_float.NAME, high_float.LIMIT, high_float.DCMA_SECTION) == ("High float", 5, "4.6")
