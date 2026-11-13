"""Missing links: an activity with no link before it, or no link after it.

DCMA-EA PAM 200.1, section 4.1 (Logic): "Any incomplete task that is missing a predecessor
and/or a successor" ... "should not exceed 5%".
"""

# ---------- Constants ----------

NAME = "Missing links"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.1"  # Logic


def fails(activity):
    """True when the activity has nothing before it, or nothing after it."""
    return not (activity.has_predecessor and activity.has_successor)
