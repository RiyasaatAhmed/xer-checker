"""The schedule itself, as plain records: its P6 projects, every activity and every link.

The checks only count; this keeps what a scheduler needs to see behind a number: names, WBS,
dates, durations and float in days. Saved per upload, it also feeds the schedule overview.
"""

from dataclasses import dataclass
from datetime import datetime

from .checks import DEFAULT_HOURS_PER_DAY, float_days, hours_per_day_of, is_checked, number

# ---------- Constants ----------

DATE_FORMATS = ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y")  # P6 export styles


@dataclass(frozen=True)
class Project:
    """One P6 project in the file."""
    p6_id: str  # PROJECT.proj_id
    name: str  # proj_short_name, the ID schedulers know it by
    data_date: datetime | None  # last_recalc_date: before it is actual, after it is forecast
    planned_start: datetime | None  # plan_start_date
    deadline: datetime | None  # plan_end_date, the "must finish by" date; often blank
    forecast_finish: datetime | None  # scd_end_date, P6's calculated finish


@dataclass(frozen=True)
class Activity:
    """One activity, with what a scheduler needs to find it and judge it."""
    p6_id: str  # TASK.task_id, P6's internal key
    code: str  # task_code, the activity ID schedulers see
    name: str
    wbs: str  # the WBS element's name
    task_type: str  # TT_Task, TT_Mile, ...
    status: str  # TK_NotStart, TK_Active, TK_Complete
    checked: bool  # one of the activities DCMA checks
    float_days: float | None  # total float in working days, on its own calendar
    duration_days: float | None  # remaining duration in working days
    start: datetime | None  # actual start, else early start
    finish: datetime | None  # actual finish, else early finish
    constraint_type: str  # cstr_type, blank when none
    line: int  # its line in the file


@dataclass(frozen=True)
class Link:
    """One relationship between two activities."""
    pred_p6_id: str  # the earlier activity
    succ_p6_id: str  # the later activity
    link_type: str  # PR_FS, PR_SS, PR_FF, PR_SF
    lag_hours: float  # below 0 is a lead, above 0 a lag; hours, as stored (no lag calendar assumed)
    line: int


@dataclass(frozen=True)
class Schedule:
    projects: list
    activities: list
    links: list  # every usable link row, in file order
    counted: set  # the lines of the links counted: one per pair of activities
    duplicate_links: int  # rows that link a pair already linked, replaced by the later row


def read_schedule(tables):
    """The projects, activities and links in the tables the reader returns."""
    hours_per_day = hours_per_day_of(tables)
    wbs = {w["wbs_id"]: w.get("wbs_name", "") for w in tables.get("PROJWBS", [])}
    tasks = {t["task_id"]: t for t in tables.get("TASK", [])}
    projects = [project(p) for p in tables.get("PROJECT", [])]
    activities = [activity(t, hours_per_day, wbs) for t in tasks.values()]

    # One link per pair of activities. A pair linked twice (FS, then FF) keeps its later row,
    # as Kazinex counts it. Broken links (an end missing) are already reported by the checks.
    links, last_of_pair = [], {}
    for row in tables.get("TASKPRED", []):
        if row["task_id"] not in tasks or row["pred_task_id"] not in tasks:
            continue
        lag_hours = number(row.get("lag_hr_cnt") or "0") or 0.0
        links.append(Link(row["pred_task_id"], row["task_id"], row.get("pred_type", ""), lag_hours, row["_line"]))
        last_of_pair[(row["pred_task_id"], row["task_id"])] = row["_line"]
    counted = set(last_of_pair.values())
    return Schedule(projects, activities, links, counted, len(links) - len(counted))


def project(row):
    return Project(row.get("proj_id", ""), row.get("proj_short_name", ""), date(row.get("last_recalc_date")),
                   date(row.get("plan_start_date")), date(row.get("plan_end_date")), date(row.get("scd_end_date")))


def activity(task, hours_per_day, wbs):
    per_day = hours_per_day.get(task.get("clndr_id"), DEFAULT_HOURS_PER_DAY)
    remaining = number(task.get("remain_drtn_hr_cnt") or "")
    return Activity(
        p6_id=task["task_id"], code=task["task_code"], name=task.get("task_name", ""), wbs=wbs.get(task.get("wbs_id"), ""),
        task_type=task["task_type"], status=task["status_code"], checked=is_checked(task),
        float_days=float_days(task, hours_per_day, []),  # its problems are already reported by the checks
        duration_days=remaining / per_day if remaining is not None else None,
        start=date(task.get("act_start_date")) or date(task.get("early_start_date")),
        finish=date(task.get("act_end_date")) or date(task.get("early_end_date")),
        constraint_type=task.get("cstr_type", ""), line=task["_line"])


def date(text):
    """A P6 date or date-time, or None when blank or in a style not listed in DATE_FORMATS."""
    for style in DATE_FORMATS:
        try:
            return datetime.strptime((text or "").strip(), style)
        except ValueError:
            continue
    return None
