"""Missed tasks: work that finished, or should have, later than its baseline.

DCMA-EA PAM 200.1, section 4.11 (Missed Tasks): should not exceed 5%. Needs a baseline schedule.
"""

# ---------- Constants ----------

NAME = "Missed tasks"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.11"  # Missed Tasks
GROUP = "Execution"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = "baseline"  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """False: this check can't run until the checker reads a baseline."""
    return False
