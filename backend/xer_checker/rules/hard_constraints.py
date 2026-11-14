"""Hard constraints: an activity pinned to a date that overrides its logic.

DCMA-EA PAM 200.1, section 4.5 (Hard Constraints): Must Start On, Must Finish On and their on or before
forms, should not exceed 5%. Soft constraints (on or after, as late as possible) are fine.
"""

# ---------- Constants ----------

NAME = "Hard constraints"  # shown in the report, the chart, the summary and the API
LIMIT = 5  # %: DCMA flags the schedule above this
DCMA_SECTION = "4.5"  # Hard Constraints
GROUP = "Constraints"  # the set it belongs to on the check board
MEASURE = "percent"  # a share of the activities checked
DIRECTION = "above"  # flagged above the limit
SEVERITY = 2  # 1 minor, 2 serious, 3 critical: breaks ties between checks over their limit
NEEDS = None  # what the file must hold for the check to run; None means nothing extra

HARD = ("CS_MSO", "CS_MEO", "CS_MSOB", "CS_MEOB", "CS_MANDSTART", "CS_MANDFIN")  # P6 codes of the hard constraints


def fails(activity):
    """True when the activity has a hard constraint, as its first or its second constraint."""
    return activity.constraint_type in HARD or activity.secondary_constraint_type in HARD
