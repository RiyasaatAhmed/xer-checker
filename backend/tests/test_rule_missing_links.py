"""The missing-links rule (xer_checker/rules/missing_links.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import missing_links


def linked(before, after):
    """An activity with or without a link before it and after it."""
    return Activity("A1", has_predecessor=before, has_successor=after, float_days=0)


def test_fails_without_a_link_before_it_or_after_it():
    assert missing_links.fails(linked(before=False, after=True))
    assert missing_links.fails(linked(before=True, after=False))
    assert missing_links.fails(linked(before=False, after=False))


def test_passes_with_a_link_on_both_sides():
    assert not missing_links.fails(linked(before=True, after=True))


def test_matches_dcma_4_1():
    assert (missing_links.NAME, missing_links.LIMIT, missing_links.DCMA_SECTION) == ("Missing links", 5, "4.1")
