"""Lags: an activity with a link into it that has a positive lag.

DCMA-EA PAM 200.1, section 4.3 (Lags): positive lag ... should not exceed 5%.
The checker counts activities, not links: an activity fails when any link into it has a lag.
"""

# ---------- Constants ----------

NAME = "Lags"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.3"  # Lags
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when a link into the activity has a positive lag."""
    return activity.has_lag
