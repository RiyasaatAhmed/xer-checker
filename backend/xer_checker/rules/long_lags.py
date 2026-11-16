"""Long lags: an activity with a link into it that has a lead or lag of 10 working days or more.

Not a DCMA check: DCMA 4.2 and 4.3 count leads and lags of any length. A wait of 2 working weeks or more,
like curing or an approval, is work the schedule should show as its own activity. Hidden in a link, it
can't be tracked or statused. The 10-day line and the 5% limit are Kazinex's Long Lags check.
"""

# ---------- Constants ----------

NAME = "Long lags"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: Kazinex's limit for long lags
LONG_LAG_DAYS = 10  # working days: a lead or lag this long or longer is "long"
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when a link into the activity has a lead or lag of 10 working days or more."""
    return activity.longest_lag_days is not None and activity.longest_lag_days >= LONG_LAG_DAYS
