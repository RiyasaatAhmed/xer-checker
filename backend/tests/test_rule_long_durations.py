"""The long-durations rule (xer_checker/rules/long_durations.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import long_durations


def lasting(days):
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, duration_days=days)


def test_fails_over_44_days():
    assert long_durations.fails(lasting(44.125))


def test_passes_at_exactly_44_days_or_with_a_blank_duration():
    assert not long_durations.fails(lasting(44))
    assert not long_durations.fails(lasting(None))
