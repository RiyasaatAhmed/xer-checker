"""High float: so much spare time that a link may be missing.

DCMA-EA PAM 200.1, section 4.6 (High Float): "total float greater than 44 working days" ...
"If the percentage ... exceeds 5%".
"""

# ---------- Constants ----------

NAME = "High float"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.6"  # High Float
HIGH_FLOAT_DAYS = 44  # float above 44 working days is "high"; exactly 44 is not
GROUP = "Float"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity's float is over 44 working days. A blank float can't fail."""
    return activity.float_days is not None and activity.float_days > HIGH_FLOAT_DAYS
