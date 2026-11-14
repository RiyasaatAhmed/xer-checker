"""Link types: an activity with a link into it that is not finish to start.

DCMA-EA PAM 200.1, section 4.4 (Relationship Types): at least 90% of links should be finish to start.
The checker counts activities, not links, so the limit is the other 10%.
An activity fails when any link into it is start to start, finish to finish or start to finish.
"""

# ---------- Constants ----------

NAME = "Link types"  # shown in the report, the chart, the summary and the API
LIMIT = 10  # %: at most 10% of activities may have a link that isn't finish to start
DCMA_SECTION = "4.4"  # Relationship Types
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when a link into the activity is not finish to start."""
    return activity.has_odd_link
