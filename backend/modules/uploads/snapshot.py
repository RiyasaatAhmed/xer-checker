"""Save an upload's schedule (projects, activities, links), and read it back for the API:
the project dates, the schedule overview, and the details of the activities behind each number."""

from collections import Counter

from sqlmodel import select

from modules.uploads.model import Activity, Relationship, ScheduleProject
from modules.uploads.schema import ActivityRow, Overview, ProjectInfo
from xer_checker.overview import STATUS, overview

# ---------- Constants ----------

DAYS_SHOWN = 2  # decimals of float and duration in days, as Kazinex shows them


def save_schedule(session, upload_id, schedule):
    """Add the schedule's rows for one upload. The caller commits, with the rest of the upload."""
    session.add_all(ScheduleProject(upload_id=upload_id, **{
        "p6_id": p.p6_id, "name": p.name, "data_date": p.data_date, "planned_start": p.planned_start,
        "deadline": p.deadline, "forecast_finish": p.forecast_finish}) for p in schedule.projects)
    session.add_all(Activity(
        upload_id=upload_id, p6_task_id=a.p6_id, activity_code=a.code, name=a.name, wbs=a.wbs, task_type=a.task_type,
        status=a.status, checked=a.checked, float_days=a.float_days, duration_days=a.duration_days, start=a.start,
        finish=a.finish, constraint_type=a.constraint_type, source_line=a.line) for a in schedule.activities)
    session.add_all(Relationship(
        upload_id=upload_id, pred_p6_task_id=l.pred_p6_id, succ_p6_task_id=l.succ_p6_id, link_type=l.link_type,
        lag_hours=l.lag_hours, counted=l.line in schedule.counted, source_line=l.line) for l in schedule.links)


def read_schedule(session, upload_id):
    """(projects, overview, {activity code: ActivityRow}) for one upload, from its saved rows.

    An upload saved before the schedule was kept has no rows: no projects, no overview, no details.
    """
    projects = session.exec(select(ScheduleProject).where(ScheduleProject.upload_id == upload_id)
                            .order_by(ScheduleProject.id)).all()
    activities = session.exec(select(Activity).where(Activity.upload_id == upload_id)
                              .order_by(Activity.source_line)).all()
    if not activities:
        return [], None, {}
    links = session.exec(select(Relationship).where(Relationship.upload_id == upload_id)).all()
    counted = [l for l in links if l.counted]
    before = Counter(l.succ_p6_task_id for l in counted)  # links into each activity
    after = Counter(l.pred_p6_task_id for l in counted)  # links out of each activity
    details = {}
    for a in activities:  # an ID repeated across 2 P6 projects keeps the first
        details.setdefault(a.activity_code, row_of(a, before[a.p6_task_id], after[a.p6_task_id]))
    return ([project_info(p) for p in projects], Overview(**overview(activities, counted, len(links) - len(counted))), details)


def project_info(p):
    return ProjectInfo(name=p.name, data_date=p.data_date, planned_start=p.planned_start,
                       deadline=p.deadline, forecast_finish=p.forecast_finish)


def row_of(a, predecessors, successors):
    """One activity as the drill-down table shows it, with its link counts in and out."""
    return ActivityRow(
        code=a.activity_code, name=a.name, wbs=a.wbs, status=STATUS.get(a.status, a.status),
        float_days=rounded(a.float_days), duration_days=rounded(a.duration_days), start=a.start, finish=a.finish,
        predecessors=predecessors, successors=successors)


def rounded(days):
    return None if days is None else round(days, DAYS_SHOWN)
