"""Resources: an activity with a duration and no resource assigned.

DCMA-EA PAM 200.1, section 4.10 (Resources): tasks with durations greater than zero should have dollars or hours.
The PAM sets no limit, so any hit is flagged.
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

def fails(activity):
    """True when the activity has a duration greater than zero and no resource."""
    return activity.original_days is not None and activity.original_days > 0 and not activity.has_resource
