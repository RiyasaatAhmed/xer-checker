"""The invalid dates rule (xer_checker/rules/invalid_dates.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import invalid_dates


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert invalid_dates.fails(one(invalid_date=True))


def test_passes_when_it_does_not():
    assert not invalid_dates.fails(one(invalid_date=False))


def test_matches_its_name_limit_and_section():
    assert (invalid_dates.NAME, invalid_dates.LIMIT, invalid_dates.DCMA_SECTION, invalid_dates.GROUP) == ("Invalid dates", 0, "4.9", "Dates")
