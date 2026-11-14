"""Resources: work of a day or more with no resource assigned.

DCMA-EA PAM 200.1, section 4.10 (Resources): tasks with durations of at least one day that have no resources.
Only runs when the file holds resource assignments.
"""

# ---------- Constants ----------

NAME = "Resources"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any hit is flagged
DCMA_SECTION = "4.10"  # Resources
GROUP = "Resources"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = "resources"  # what the file must hold for the check to run; None means nothing extra

MIN_DAYS = 1  # work shorter than this needs no resource


def fails(activity):
    """True when the activity lasts a day or more and has no resource."""
    return activity.duration_days is not None and activity.duration_days >= MIN_DAYS and not activity.has_resource
