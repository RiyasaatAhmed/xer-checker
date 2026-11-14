"""Long durations: more than 44 working days of work left in one activity.

DCMA-EA PAM 200.1, section 4.8 (High Duration): duration greater than 44 working days ... should not exceed 5%.
The checker reads the remaining duration: the file holds no baseline to read the planned one from.
"""

# ---------- Constants ----------

NAME = "Long durations"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.8"  # High Duration
GROUP = "Duration"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra

LONG_DAYS = 44  # a remaining duration over 44 working days is "long"; exactly 44 is not


def fails(activity):
    """True when the activity has more than 44 working days left. A blank duration can't fail."""
    return activity.duration_days is not None and activity.duration_days > LONG_DAYS
