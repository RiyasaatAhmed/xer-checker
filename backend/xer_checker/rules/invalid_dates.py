"""Invalid dates: an actual date after the data date, or work not started with a forecast start before it.

DCMA-EA PAM 200.1, section 4.9 (Invalid Dates): actual dates in the future and forecast dates in the past.
Needs the project's data date.
"""

# ---------- Constants ----------

NAME = "Invalid dates"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any hit is flagged
DCMA_SECTION = "4.9"  # Invalid Dates
GROUP = "Dates"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 3  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = "data date"  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity's dates contradict the data date."""
    return activity.invalid_date
