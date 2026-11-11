"""The three DCMA checks on unfinished work activities: missing links, negative float, high float."""

# ---------- Constants ----------

# P6 codes (TASK.status_code and TASK.task_type)
FINISHED = "TK_Complete"  # status of a finished activity
# Activity types DCMA leaves out: level of effort, WBS summary, start milestone, finish milestone
NOT_CHECKED_TYPES = ("TT_LOE", "TT_WBS", "TT_Mile", "TT_FinMile")
DEFAULT_HOURS_PER_DAY = 8  # used when a calendar is missing or has no hours per day

# DCMA rules, from the DCMA 14-Point Assessment: section 4 of DCMA-EA PAM 200.1 (Oct 2012),
# the last published version of the checklist (copy hosted by Mosaic Projects):
#   https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf
#   https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf
HIGH_FLOAT_DAYS = 44  # float above 44 working days is "high"
LIMITS = {"Missing links": 5, "Negative float": 0, "High float": 5}  # above this %, DCMA flags the schedule


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
    """Run the three checks on unfinished work activities.

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

    failures = {name: [] for name in LIMITS}  # one empty list per check
    for t in open_tasks:
        # Check 1, missing links: nothing before it or nothing after it.
        if t["task_id"] not in has_pred or t["task_id"] not in has_succ:
            failures["Missing links"].append(t["task_code"])

        # Read the float. A blank is normal; text like "TBD" is a broken row.
        hours = number(t["total_float_hr_cnt"]) if t["total_float_hr_cnt"] else None
        if t["total_float_hr_cnt"] and hours is None:
            problems.append((t["_line"], f"TASK total float {t['total_float_hr_cnt']!r} is not a number"))
        if hours is None:
            continue  # blank float: nothing to check
        # Float is stored in hours; convert with the activity's own calendar.
        days = hours / hours_per_day.get(t["clndr_id"], DEFAULT_HOURS_PER_DAY)
        if days < 0:  # check 2: already behind the deadline
            failures["Negative float"].append(t["task_code"])
        if days > HIGH_FLOAT_DAYS:  # check 3: so much spare time can mean a missing link
            failures["High float"].append(t["task_code"])
    return len(open_tasks), failures, problems
