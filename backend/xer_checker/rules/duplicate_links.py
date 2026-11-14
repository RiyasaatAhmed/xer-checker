"""Duplicate links: a pair of activities linked twice, with this activity second.

Not a DCMA check: the limit and the check are ours. 2 link rows between the same pair of activities
are almost always a mistake. Kazinex counts such a pair once.
"""

# ---------- Constants ----------

NAME = "Duplicate links"  # shown in the report, the chart, the summary and the API
LIMIT = 0  # %: any duplicate is flagged (our limit, not DCMA's)
DCMA_SECTION = ""  # blank: not a DCMA check
GROUP = "Logic"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 1  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra


def fails(activity):
    """True when the file links a pair of activities twice, into this activity."""
    return activity.has_duplicate_link
