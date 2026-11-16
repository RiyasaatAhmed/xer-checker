"""The open-start-or-finish rule (xer_checker/rules/open_start_finish.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import open_start_finish


def test_fails_on_an_open_start_or_an_open_finish():
    assert open_start_finish.fails(Activity("A1", True, True, 0, open_start=True))
    assert open_start_finish.fails(Activity("A1", True, True, 0, open_finish=True))


def test_passes_when_its_start_is_driven_and_its_finish_drives():
    assert not open_start_finish.fails(Activity("A1", True, True, 0))
