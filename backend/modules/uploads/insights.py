"""What a scheduler asks beyond one number: is it better than last time, and where does one fix help most?"""

from collections import Counter

from sqlmodel import col, select

from modules.uploads.model import Activity, MetricResult, Relationship, Upload
from modules.uploads.schema import FixFirst, OpenEnd, Previous, Repeat
from xer_checker.causes import open_ends
from xer_checker.rules import BY_METRIC, rule_id

# ---------- Constants ----------

SHOWN = 5  # activities listed per kind of fix
MIN_FAILS = 2  # an activity is a repeat offender when at least this many checks flag it


def previous_of(session, upload):
    """The last earlier ready upload of the same file name, or None."""
    earlier = session.exec(select(Upload).where(Upload.file_name == upload.file_name, Upload.status == "ready",
                                                Upload.id != upload.id, Upload.created_at < upload.created_at)
                           .order_by(col(Upload.created_at).desc()).limit(1)).first()
    if earlier is None:
        return None
    metrics = session.exec(select(MetricResult).where(MetricResult.upload_id == earlier.id)).all()
    values = {rule_id(BY_METRIC[m.metric_id]): round(m.value, 1) for m in metrics
              if m.metric_id in BY_METRIC and m.verdict != "not_applicable"}
    return Previous(upload_id=earlier.id, uploaded_at=earlier.created_at, values=values)


def fix_first(session, upload_id, flag_counts):
    """The open ends that may clear many flags, and the activities that fail the most checks.

    flag_counts: {activity code: how many checks flag it}.
    """
    repeat = [(code, n) for code, n in Counter(flag_counts).most_common() if n >= MIN_FAILS][:SHOWN]
    activities = session.exec(select(Activity).where(Activity.upload_id == upload_id)).all()
    by_code = {}
    for a in activities:  # an ID repeated across 2 P6 projects keeps the first
        by_code.setdefault(a.activity_code, a)
    code_of = {a.p6_task_id: a.activity_code for a in activities}
    links = session.exec(select(Relationship).where(Relationship.upload_id == upload_id, Relationship.counted)).all()
    ends = open_ends({a.p6_task_id for a in activities if a.checked},
                     {a.p6_task_id for a in activities if flag_counts.get(a.activity_code)},
                     [(l.pred_p6_task_id, l.succ_p6_task_id) for l in links])[:SHOWN]
    by_id = {a.p6_task_id: a for a in activities}
    return FixFirst(
        open_ends=[OpenEnd(code=code_of[i], name=by_id[i].name, wbs=by_id[i].wbs, clears=n) for i, n in ends],
        repeat_offenders=[Repeat(code=c, name=by_code[c].name, wbs=by_code[c].wbs, fails=n) for c, n in repeat if c in by_code])
