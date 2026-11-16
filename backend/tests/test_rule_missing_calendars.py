"""The missing-calendars rule (xer_checker/rules/missing_calendars.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import missing_calendars


def test_fails_when_the_calendar_is_not_in_the_file():
    assert missing_calendars.fails(Activity("A1", True, True, 0, calendar_missing=True))
    assert not missing_calendars.fails(Activity("A1", True, True, 0))
