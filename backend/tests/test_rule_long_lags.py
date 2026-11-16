"""The long-lags rule (xer_checker/rules/long_lags.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import long_lags


def lagged(days):
    return Activity("A1", True, True, 0, longest_lag_days=days)


def test_fails_at_10_working_days_or_more():
    assert long_lags.fails(lagged(10)) and long_lags.fails(lagged(20))


def test_passes_under_10_days_or_with_no_link():
    assert not long_lags.fails(lagged(9.9))
    assert not long_lags.fails(lagged(None))
