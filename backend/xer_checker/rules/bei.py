"""Baseline execution index: finished work against what the baseline planned to finish.

DCMA-EA PAM 200.1, section 4.14 (BEI): tasks finished / tasks planned to finish, flagged below 0.95.
Needs a baseline schedule.
"""

# ---------- Constants ----------

NAME = "BEI"  # shown in the report, the chart, the summary and the API
LIMIT = 0.95  # an index: flagged below this
DCMA_SECTION = "4.14"  # BEI
GROUP = "Execution"  # the set it belongs to on the check board
MEASURE = "index"  # a ratio, not a share of activities
DIRECTION = "below"  # flagged below the limit
SEVERITY = 3  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = "baseline"  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """False: this check can't run until the checker reads a baseline."""
    return False
