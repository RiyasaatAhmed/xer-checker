"""What's in the schedule, counted: activities by status and type, links by type, leads and lags,
constraints, and the float profile of the activities DCMA checks.

These are facts read from the file, not pass or fail. They take plain records with the fields of
schedule.Activity and schedule.Link, so the same counts work on a fresh file or on saved rows.
"""

from collections import Counter

from .checks import percent
from .rules.high_float import HIGH_FLOAT_DAYS

# ---------- Constants ----------

# P6 codes in the order and words a scheduler reads them
STATUS = {"TK_NotStart": "Not started", "TK_Active": "In progress", "TK_Complete": "Complete"}
TYPES = {"TT_Task": "Task", "TT_Rsrc": "Resource dependent", "TT_Mile": "Start milestone",
         "TT_FinMile": "Finish milestone", "TT_LOE": "Level of effort", "TT_WBS": "WBS summary"}
LINK_TYPES = {"PR_FS": "Finish to start", "PR_SS": "Start to start", "PR_FF": "Finish to finish", "PR_SF": "Start to finish"}
CONSTRAINTS = {"CS_MSO": "Start on", "CS_MSOA": "Start on or after", "CS_MSOB": "Start on or before",
               "CS_MEO": "Finish on", "CS_MEOA": "Finish on or after", "CS_MEOB": "Finish on or before",
               "CS_MANDSTART": "Mandatory start", "CS_MANDFIN": "Mandatory finish", "CS_ALAP": "As late as possible"}

LOW_FLOAT_DAYS = 10  # under two working weeks of float: close to critical

# Float bands for the activities DCMA checks. The first and last match the negative and high float checks.
FLOAT_BANDS = (
    ("negative", "Below 0 days", lambda d: d < 0),
    ("zero", "0 days (critical)", lambda d: d == 0),
    ("low", f"Up to {LOW_FLOAT_DAYS} days", lambda d: 0 < d <= LOW_FLOAT_DAYS),
    ("mid", f"{LOW_FLOAT_DAYS} to {HIGH_FLOAT_DAYS} days", lambda d: LOW_FLOAT_DAYS < d <= HIGH_FLOAT_DAYS),
    ("high", f"Over {HIGH_FLOAT_DAYS} days", lambda d: d > HIGH_FLOAT_DAYS),
)


def overview(activities, links, duplicate_links):
    """The counts behind the "What's in the file" section. Every share is a % of its own total.

    `links` are the counted ones: one per pair of activities.
    """
    checked = [a for a in activities if a.checked]
    floats = [a.float_days for a in checked if a.float_days is not None]
    return {
        "activities": len(activities),
        "checked": len(checked),
        "by_status": parts(Counter(a.status for a in activities), STATUS, len(activities)),
        "by_type": parts(Counter(a.task_type for a in activities), TYPES, len(activities)),
        "links": len(links),
        "duplicate_links": duplicate_links,
        "by_link_type": parts(Counter(l.link_type for l in links), LINK_TYPES, len(links)),
        "leads": sum(1 for l in links if l.lag_hours < 0),  # a negative lag: the later activity overlaps
        "lags": sum(1 for l in links if l.lag_hours > 0),
        "constraints": sum(1 for a in activities if a.constraint_type),
        "by_constraint": parts(Counter(a.constraint_type for a in activities if a.constraint_type), CONSTRAINTS, len(activities)),
        "float_profile": [{"key": key, "label": label, "count": sum(1 for d in floats if test(d))} for key, label, test in FLOAT_BANDS],
        "no_float": len(checked) - len(floats),  # checked activities with a blank float
    }


def parts(counts, labels, total):
    """[{key, label, count, percent}], in the labels' order, then any code not in it, as it's written."""
    keys = [k for k in labels if counts[k]] + sorted(k for k in counts if k not in labels)
    return [{"key": k, "label": labels.get(k, k), "count": counts[k], "percent": round(percent(counts[k], total), 1)} for k in keys]
