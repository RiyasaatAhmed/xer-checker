"""The lags rule (xer_checker/rules/lags.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import lags


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert lags.fails(one(has_lag=True))


def test_passes_when_it_does_not():
    assert not lags.fails(one(has_lag=False))


def test_matches_its_name_limit_and_section():
    assert (lags.NAME, lags.LIMIT, lags.DCMA_SECTION, lags.GROUP) == ("Lags", 5, "4.3", "Logic")
