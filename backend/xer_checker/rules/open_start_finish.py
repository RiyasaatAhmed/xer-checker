"""Open start or finish: an activity whose links don't drive it, or that drives nothing.

Not a DCMA check: the check and its limit are ours. DCMA 4.1 (Logic) only asks for a link on each side.
A scheduler also asks what each link drives:
  - Open start: it has predecessors, but none is finish to start or start to start. Nothing holds its start back.
  - Open finish: it has successors, but none is finish to start or finish to finish. Its finish can slip
    without moving anything after it.
An activity with no link on a side fails Missing links instead, not this check.
"""

# ---------- Constants ----------

NAME = "Open start or finish"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: the same limit as DCMA 4.1 (Logic), since both are gaps in the logic
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: a slip it hides can move the finish
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity's start is not driven, or its finish drives nothing."""
    return activity.open_start or activity.open_finish
