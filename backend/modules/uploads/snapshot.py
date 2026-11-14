"""Save an upload's schedule (projects, activities, links), and read it back for the API:
the project dates, the schedule overview, and the details of the activities behind each number."""

from collections import Counter
from types import SimpleNamespace

from sqlalchemy import insert
from sqlmodel import select

from modules.uploads.model import Activity, Relationship, ScheduleProject, WbsNode
from modules.uploads.schema import ActivityRow, Neighbor, Overview, ProjectInfo, WbsGroup
from xer_checker.overview import STATUS, overview
from xer_checker.structure import structure

# ---------- Constants ----------

DAYS_SHOWN = 2  # decimals of float and duration in days, as Kazinex shows them
NEIGHBORS_SHOWN = 4  # linked activities sent per side; the counts say how many there are in all


def save_schedule(session, upload_id, schedule):
    """Add the schedule's rows for one upload. The caller commits, with the rest of the upload."""
    session.add_all(ScheduleProject(upload_id=upload_id, **{
        "p6_id": p.p6_id, "name": p.name, "data_date": p.data_date, "planned_start": p.planned_start,
        "deadline": p.deadline, "forecast_finish": p.forecast_finish}) for p in schedule.projects)
    bulk_insert(session, Activity, [dict(
        upload_id=upload_id, p6_task_id=a.p6_id, activity_code=a.code, name=a.name, wbs=a.wbs, p6_wbs_id=a.p6_wbs_id, task_type=a.task_type,
        status=a.status, checked=a.checked, float_days=a.float_days, duration_days=a.duration_days, start=a.start,
        finish=a.finish, constraint_type=a.constraint_type, source_line=a.line) for a in schedule.activities])
    session.add_all(WbsNode(upload_id=upload_id, p6_wbs_id=n.p6_id, parent_p6_wbs_id=n.parent_id, name=n.name, seq=n.seq)
                    for n in schedule.wbs_nodes)
    bulk_insert(session, Relationship, [dict(
        upload_id=upload_id, pred_p6_task_id=l.pred_p6_id, succ_p6_task_id=l.succ_p6_id, link_type=l.link_type,
        lag_hours=l.lag_hours, counted=l.line in schedule.counted, source_line=l.line) for l in schedule.links])


def bulk_insert(session, model, rows):
    """Add many rows in one statement per batch. Far faster than adding them one object at a time:
    a file with 20,000 activities has tens of thousands of rows to save."""
    if rows:
        session.execute(insert(model), rows)


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
    by_id = {a.p6_task_id: a for a in activities}
    ins, outs = {}, {}  # activity -> the links into it, and out of it
    for l in counted:
        ins.setdefault(l.succ_p6_task_id, []).append(l)
        outs.setdefault(l.pred_p6_task_id, []).append(l)
    details = {}
    for a in activities:  # an ID repeated across 2 P6 projects keeps the first
        details.setdefault(a.activity_code, row_of(
            a, before[a.p6_task_id], after[a.p6_task_id],
            neighbors(ins.get(a.p6_task_id, []), by_id, "pred_p6_task_id"), neighbors(outs.get(a.p6_task_id, []), by_id, "succ_p6_task_id")))
    return ([project_info(p) for p in projects], Overview(**overview(activities, counted, len(links) - len(counted))), details)


def project_info(p):
    return ProjectInfo(name=p.name, data_date=p.data_date, planned_start=p.planned_start,
                       deadline=p.deadline, forecast_finish=p.forecast_finish)


def neighbors(links, by_id, side):
    """The first few activities on one side of an activity, with the link that joins them."""
    return [Neighbor(code=by_id[getattr(l, side)].activity_code, name=by_id[getattr(l, side)].name,
                     link_type=l.link_type, lag_hours=l.lag_hours)
            for l in links[:NEIGHBORS_SHOWN] if getattr(l, side) in by_id]


def read_structure(session, upload_id, flags, rule_count):
    """The WBS tree with counts and dates rolled up. Empty for an upload saved before the tree was kept."""
    nodes = session.exec(select(WbsNode).where(WbsNode.upload_id == upload_id)).all()
    if not nodes:
        return []
    activities = session.exec(select(Activity).where(Activity.upload_id == upload_id)).all()
    nodes = [SimpleNamespace(p6_id=n.p6_wbs_id, parent_id=n.parent_p6_wbs_id, name=n.name, seq=n.seq) for n in nodes]
    return [WbsGroup(**group) for group in structure(nodes, [wbs_activity(a) for a in activities], flags, rule_count)]


def wbs_activity(a):
    """The fields of a saved activity that the roll-up reads."""
    return SimpleNamespace(code=a.activity_code, p6_wbs_id=a.p6_wbs_id, checked=a.checked, start=a.start, finish=a.finish)


def row_of(a, predecessors, successors, before=(), after=()):
    """One activity as the drill-down table shows it, with its link counts in and out, and a few neighbors."""
    return ActivityRow(
        code=a.activity_code, name=a.name, wbs=a.wbs, status=STATUS.get(a.status, a.status),
        float_days=rounded(a.float_days), duration_days=rounded(a.duration_days), start=a.start, finish=a.finish,
        predecessors=predecessors, successors=successors, before=list(before), after=list(after))


def rounded(days):
    return None if days is None else round(days, DAYS_SHOWN)
