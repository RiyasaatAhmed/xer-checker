"""The link types rule (xer_checker/rules/link_types.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import link_types


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert link_types.fails(one(has_odd_link=True))


def test_passes_when_it_does_not():
    assert not link_types.fails(one(has_odd_link=False))


def test_matches_its_name_limit_and_section():
    assert (link_types.NAME, link_types.LIMIT, link_types.DCMA_SECTION, link_types.GROUP) == ("Link types", 10, "4.4", "Logic")
