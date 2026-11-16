"""Status conflicts: an activity whose status disagrees with its actual dates.

Not a DCMA check: the check and its limit are ours. It sits beside DCMA 4.9 (Invalid Dates), which
checks the dates against the data date. This check compares the status with the dates. It fails when:
  - Not started: it has an actual start or an actual finish.
  - In progress: it has no actual start, or it has an actual finish.
  - In progress: it has no remaining duration, so it should be finished.
Finished work is outside the checked activities, as DCMA says. A file with no actual date columns at
all can't be judged: the check says so instead.
"""

# ---------- Constants ----------

NAME = "Status conflicts"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any hit is flagged (our limit, not DCMA's)
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Dates"  # the set it belongs to on the check board, beside Invalid dates
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: the progress can't be trusted
NEEDS = "actual dates"  # a file without the actual date columns can't show a conflict


def fails(activity):
    """True when the activity's status disagrees with its actual dates or remaining duration."""
    return activity.status_conflict
