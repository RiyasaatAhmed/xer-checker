"""Run the DCMA rules on unfinished work activities. Each rule is its own file in rules/."""

import math  # tells a finite number from "inf" and "NaN"

from .activity import Activity
from .availability import data_dates, unavailable
from .dates import date
from .rules import DIRECTIONS, LIMITS, RULES

# ---------- Constants ----------

# P6 codes (TASK.status_code and TASK.task_type)
FINISHED = "TK_Complete"  # status of a finished activity
# Activity types DCMA leaves out: level of effort, WBS summary, start milestone, finish milestone
NOT_CHECKED_TYPES = ("TT_LOE", "TT_WBS", "TT_Mile", "TT_FinMile")
DEFAULT_HOURS_PER_DAY = 8  # used when a calendar is missing or has no hours per day
NOT_STARTED, ACTIVE = "TK_NotStart", "TK_Active"  # statuses of work that hasn't started, and work in progress
FINISH_TO_START = "PR_FS"  # the link type DCMA wants most links to be

# The rules come from the DCMA 14-Point Assessment, section 4 of DCMA-EA PAM 200.1 (Oct 2012).
# That is the last published version of the checklist. Mosaic Projects hosts a copy:
#   https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf
#   https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf


# ---------- Small helpers, shared with the report, the chart and the summary ----------

def number(text):
    """float(text), or None if text isn't a finite number."""
    try:
        value = float(text)  # "12.5" -> 12.5
    except ValueError:
        return None  # "TBD" -> None, instead of crashing
    return value if math.isfinite(value) else None  # "inf" and "NaN" parse, but no P6 value is either


def percent(count, checked):
    """count as a % of the activities checked (0 if nothing was checked, instead of dividing by 0)."""
    return 100 * count / checked if checked else 0


def within_limit(check_name, pct):
    """True when a check's value is on the right side of its limit. DCMA flags only what's past it."""
    return pct >= LIMITS[check_name] if DIRECTIONS[check_name] == "below" else pct <= LIMITS[check_name]


def is_checked(task):
    """True for unfinished work, as DCMA says: not finished, not level of effort, a WBS summary or a milestone."""
    return task["status_code"] != FINISHED and task["task_type"] not in NOT_CHECKED_TYPES


def hours_per_day_of(tables):
    """{calendar ID: hours in its working day}, from the CALENDAR table. A blank or bad value means 8."""
    return {c["clndr_id"]: number(c.get("day_hr_cnt", "")) or DEFAULT_HOURS_PER_DAY for c in tables.get("CALENDAR", [])}


# ---------- The checks ----------

def check(tables):
    """Run every rule on unfinished work activities.

    Returns (activities checked, {check name: [failing activity codes]}, problems):
      problems  [(line number, problem), ...] for data the checks can't use (bad links, float typed as text)
    """
    problems = []
    # Lookups: calendar ID -> hours in its working day, and activity ID -> activity row.
    hours_per_day = hours_per_day_of(tables)
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

    open_tasks = [t for t in tasks.values() if is_checked(t)]  # unfinished work only, as DCMA says
    skipped = unavailable(RULES, tables)  # checks this file can't support: they get no result, only a reason
    extra = LinkFacts(tables, tasks)
    dates_of = data_dates(tables)
    with_resource = {r["task_id"] for r in tables.get("TASKRSRC", []) if "task_id" in r}

    failures = {rule.NAME: [] for rule in RULES}  # one empty list per rule, in report order
    for t in open_tasks:
        task_id = t["task_id"]
        remaining = number(t.get("remain_drtn_hr_cnt") or "")
        per_day = hours_per_day.get(t["clndr_id"], DEFAULT_HOURS_PER_DAY)
        activity = Activity(
            t["task_code"], task_id in has_pred, task_id in has_succ, float_days(t, hours_per_day, problems),
            has_lead=task_id in extra.leads, has_lag=task_id in extra.lags, has_odd_link=task_id in extra.odd,
            has_duplicate_link=task_id in extra.duplicates, out_of_sequence=task_id in extra.out_of_sequence,
            duration_days=remaining / per_day if remaining is not None else None, constraint_type=t.get("cstr_type", ""),
            secondary_constraint_type=t.get("cstr_type2", ""),
            invalid_date=invalid_date(t, dates_of.get(t.get("proj_id"))), has_resource=task_id in with_resource)
        for rule in RULES:  # each rule decides on its own; see rules/
            if rule.NAME not in skipped and rule.fails(activity):
                failures[rule.NAME].append(activity.code)
    return len(open_tasks), failures, problems


class LinkFacts:
    """What the links say about each activity, counting one link per pair (the later row), as Kazinex does.

    Each set holds the IDs of the later activities. The sets: leads, lags, links that aren't finish to start,
    pairs linked twice, and work started before its finish to start predecessor finished.
    """

    def __init__(self, tables, tasks):
        last, rows = {}, tables.get("TASKPRED", [])
        seen, self.duplicates = set(), set()
        for link in rows:
            pair = (link.get("pred_task_id"), link.get("task_id"))
            if pair[0] in tasks and pair[1] in tasks:
                if pair in seen:
                    self.duplicates.add(pair[1])
                seen.add(pair)
                last[pair] = link  # the later row of a pair wins
        self.leads, self.lags, self.odd, self.out_of_sequence = set(), set(), set(), set()
        for (pred, succ), link in last.items():
            lag = number(link.get("lag_hr_cnt") or "0") or 0.0
            if lag < 0:
                self.leads.add(succ)
            if lag > 0:
                self.lags.add(succ)
            kind = link.get("pred_type", "")
            if kind and kind != FINISH_TO_START:
                self.odd.add(succ)
            if kind == FINISH_TO_START and tasks[succ]["status_code"] == ACTIVE and tasks[pred]["status_code"] != FINISHED:
                self.out_of_sequence.add(succ)


def invalid_date(task, data_date):
    """True when an actual date is after the data date, or a forecast date is before it.

    Forecast dates: work not started can't start before the data date, and unfinished work can't finish before it.
    """
    if data_date is None:
        return False
    started = date(task.get("act_start_date"))
    if started and started > data_date:
        return True
    forecast_start = date(task.get("early_start_date"))
    if task["status_code"] == NOT_STARTED and forecast_start is not None and forecast_start < data_date:
        return True
    forecast_finish = date(task.get("early_end_date"))
    return task["status_code"] in (NOT_STARTED, ACTIVE) and forecast_finish is not None and forecast_finish < data_date


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
