"""Negative float: an activity already late for a deadline.

DCMA-EA PAM 200.1, section 4.7 (Negative Float): "total float less than 0 working days" ...
"there should not be any negative float".
"""

# ---------- Constants ----------

NAME = "Negative float"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any negative float is flagged
DCMA_SECTION = "4.7"  # Negative Float


def fails(activity):
    """True when the activity's float is below 0 days. A blank float can't fail."""
    return activity.float_days is not None and activity.float_days < 0
