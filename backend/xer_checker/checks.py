"""Run the DCMA rules on unfinished work activities. Each rule is its own file in rules/."""

from .activity import Activity
from .rules import LIMITS, RULES

# ---------- Constants ----------

# P6 codes (TASK.status_code and TASK.task_type)
FINISHED = "TK_Complete"  # status of a finished activity
# Activity types DCMA leaves out: level of effort, WBS summary, start milestone, finish milestone
NOT_CHECKED_TYPES = ("TT_LOE", "TT_WBS", "TT_Mile", "TT_FinMile")
DEFAULT_HOURS_PER_DAY = 8  # used when a calendar is missing or has no hours per day

# The rules come from the DCMA 14-Point Assessment: section 4 of DCMA-EA PAM 200.1 (Oct 2012),
# the last published version of the checklist (copy hosted by Mosaic Projects):
#   https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf
#   https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf


# ---------- Small helpers, shared with the report, the chart and the summary ----------

def number(text):
    """float(text), or None if text isn't a number."""
    try:
        return float(text)  # "12.5" -> 12.5
    except ValueError:
        return None  # "TBD" -> None, instead of crashing


def percent(count, checked):
    """count as a % of the activities checked (0 if nothing was checked, instead of dividing by 0)."""
    return 100 * count / checked if checked else 0


def within_limit(check_name, pct):
    """True when a check's % is at or under its DCMA limit. DCMA flags only what's above it."""
    return pct <= LIMITS[check_name]


# ---------- The checks ----------

def check(tables):
    """Run every rule on unfinished work activities.

    Returns (activities checked, {check name: [failing activity codes]}, problems):
      problems  [(line number, problem), ...] for data the checks can't use (bad links, float typed as text)
    """
    problems = []
    # Lookups: calendar ID -> hours in its working day, and activity ID -> activity row.
    hours_per_day = {c["clndr_id"]: number(c.get("day_hr_cnt", "")) or DEFAULT_HOURS_PER_DAY for c in tables.get("CALENDAR", [])}
    tasks = {t["task_id"]: t for t in tables.get("TASK", [])}

    # Links (TASKPRED): record which activities have a predecessor and which have a successor.
    has_pred, has_succ = set(), set()
    for link in tables.get("TASKPRED", []):
        succ, pred = link["task_id"], link["pred_task_id"]  # pred comes first, then succ
        if succ not in tasks or pred not in tasks:  # the other end wasn't read: missing, or its row is broken
            problems.append((link["_line"], "TASKPRED link points to an activity that's missing or on a broken row"))
            continue
        has_pred.add(succ)  # the later activity now has something before it
        has_succ.add(pred)  # the earlier activity now has something after it

    # As DCMA says: check unfinished work only. Skip finished activities, level of effort,
    # WBS summaries and milestones.
    open_tasks = [t for t in tasks.values()
                  if t["status_code"] != FINISHED and t["task_type"] not in NOT_CHECKED_TYPES]

    failures = {rule.NAME: [] for rule in RULES}  # one empty list per rule, in report order
    for t in open_tasks:
        activity = Activity(t["task_code"], t["task_id"] in has_pred, t["task_id"] in has_succ,
                            float_days(t, hours_per_day, problems))
        for rule in RULES:  # each rule decides on its own; see rules/
            if rule.fails(activity):
                failures[rule.NAME].append(activity.code)
    return len(open_tasks), failures, problems


def float_days(task, hours_per_day, problems):
    """The activity's total float in working days, or None. Text like "TBD" is added to problems."""
    text = task["total_float_hr_cnt"]
    hours = number(text) if text else None  # a blank is normal
    if text and hours is None:
        problems.append((task["_line"], f"TASK total float {text!r} is not a number"))
    if hours is None:
        return None
    # Float is stored in hours; convert with the activity's own calendar.
    return hours / hours_per_day.get(task["clndr_id"], DEFAULT_HOURS_PER_DAY)
