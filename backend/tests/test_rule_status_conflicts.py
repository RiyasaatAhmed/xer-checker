"""The status-conflicts rule (xer_checker/rules/status_conflicts.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import status_conflicts


def test_fails_when_the_status_disagrees_with_the_dates():
    assert status_conflicts.fails(Activity("A1", True, True, 0, status_conflict=True))
    assert not status_conflicts.fails(Activity("A1", True, True, 0))
