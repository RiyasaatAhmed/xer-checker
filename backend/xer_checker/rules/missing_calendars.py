"""Missing calendars: an activity whose calendar isn't in the file.

Not a DCMA check: the check and its limit are ours. A calendar sets how many hours make a working day.
Without it the checker counts the activity's float and durations at 8 hours a day, so its float, its
high float and its long duration results are guesses. Any missing calendar is flagged.
"""

# ---------- Constants ----------

NAME = "Missing calendars"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any hit is flagged (our limit, not DCMA's)
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Duration"  # the set it belongs to on the check board: the calendar sets every duration in days
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: the float and duration results can't be trusted
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity's calendar isn't in the file."""
    return activity.calendar_missing
