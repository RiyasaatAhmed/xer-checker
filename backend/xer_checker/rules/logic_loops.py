"""Logic loops: an activity on a circular chain of links, like A -> B -> C -> A.

Not a DCMA check: the check and its limit are ours. P6 can't schedule a loop, because no activity in it
can start until another one in it finishes. P6 refuses to schedule one, so a loop in an export means
the file was edited or imported outside a scheduling run. Any loop is flagged.
"""

# ---------- Constants ----------

NAME = "Logic loops"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any loop is flagged (our limit, not DCMA's)
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 3  # 1 minor, 2 serious, 3 critical: a loop makes the dates meaningless
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the activity is on a loop."""
    return activity.in_loop
