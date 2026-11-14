"""The out-of-sequence work rule (xer_checker/rules/out_of_sequence.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import out_of_sequence


def one(**fields):
    """A linked activity with these fields set."""
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, **fields)


def test_fails_when_the_activity_breaks_it():
    assert out_of_sequence.fails(one(out_of_sequence=True))


def test_passes_when_it_does_not():
    assert not out_of_sequence.fails(one(out_of_sequence=False))


def test_matches_its_name_limit_and_section():
    assert (out_of_sequence.NAME, out_of_sequence.LIMIT, out_of_sequence.DCMA_SECTION, out_of_sequence.GROUP) == ("Out-of-sequence work", 0, "", "Logic")
