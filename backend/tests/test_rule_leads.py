"""The leads rule (xer_checker/rules/leads.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import leads


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert leads.fails(one(has_lead=True))


def test_passes_when_it_does_not():
    assert not leads.fails(one(has_lead=False))


def test_matches_its_name_limit_and_section():
    assert (leads.NAME, leads.LIMIT, leads.DCMA_SECTION, leads.GROUP) == ("Leads", 0, "4.2", "Logic")
