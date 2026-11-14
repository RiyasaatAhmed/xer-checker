"""Negative float: an activity already late for a deadline.

DCMA-EA PAM 200.1, section 4.7 (Negative Float): "total float less than 0 working days" ...
"there should not be any negative float".
"""

# ---------- Constants ----------

NAME = "Negative float"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any negative float is flagged
DCMA_SECTION = "4.7"  # Negative Float
GROUP = "Float"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 3  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity's float is below 0 days. A blank float can't fail."""
    return activity.float_days is not None and activity.float_days < 0
