"""Critical path test: a delay added to the critical path must move the finish date.

DCMA-EA PAM 200.1, section 4.12 (Critical Path Test). Needs a delay test the checker can't run yet.
"""

# ---------- Constants ----------

NAME = "Critical path test"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # pass or fail: it has no percent
DCMA_SECTION = "4.12"  # Critical Path Test
GROUP = "Execution"  # the set it belongs to on the check board
MEASURE = "test"  # pass or fail
DIRECTION = "above"  # flagged above the limit
SEVERITY = 3  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = "delay test"  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """False: this check can't run yet."""
    return False
