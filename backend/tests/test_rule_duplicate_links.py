"""The duplicate links rule (xer_checker/rules/duplicate_links.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import duplicate_links


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert duplicate_links.fails(one(has_duplicate_link=True))


def test_passes_when_it_does_not():
    assert not duplicate_links.fails(one(has_duplicate_link=False))


def test_matches_its_name_limit_and_section():
    assert (duplicate_links.NAME, duplicate_links.LIMIT, duplicate_links.DCMA_SECTION, duplicate_links.GROUP) == ("Duplicate links", 0, "", "Logic")
