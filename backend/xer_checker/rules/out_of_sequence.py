"""Out-of-sequence work: in progress while a finish to start predecessor is not finished.

Not a DCMA check. The limit and the check are ours: work that started before what it depends on finished
means the logic or the progress is wrong.
"""

# ---------- Constants ----------

NAME = "Out-of-sequence work"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any hit is flagged (our limit, not DCMA's)
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity is in progress and a finish to start predecessor is not finished."""
    return activity.out_of_sequence
