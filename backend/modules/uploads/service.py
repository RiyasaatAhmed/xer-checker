"""Check an uploaded file, save it with its results, and read saved uploads back.

The answer is always read back from the database, so a result looks the same now and later.
"""

import hashlib  # the file's fingerprint
import tempfile  # a folder that's deleted after the check
from collections import Counter  # broken rows per upload
from pathlib import Path

from sqlmodel import col, select

from modules.uploads.insights import fix_first, named, previous_of
from modules.uploads.model import FileIssue, MetricResult, MetricResultActivity, Review, ScheduleProject, Upload, as_utc
from modules.uploads.schema import CheckActivities, CheckResult, CheckStatus, RowNote, RuleResult, UploadSummary
from modules.uploads.snapshot import bulk_insert, kinded, load_schedule, read_overview, read_rows, read_structure, save_schedule
from xer_checker.checks import percent
from xer_checker.cli import check_file
from xer_checker.kinds import kinds_of
from xer_checker.reader import FileError
from xer_checker.report import verdict
from xer_checker.rules import BY_METRIC, RULES, rule_id

# ---------- Constants ----------

DEFAULT_FILE_NAME = "upload.xer"  # used when the upload has no name
READY, FAILED = "ready", "failed"  # an upload's status
OTHER_GROUP = "Other"  # the group of a saved check this version of the checker no longer has
AI_AUTHOR = "Gemini"  # how the summary's author starts when the AI wrote it
TO_VERDICT = {"pass": "pass", "FLAG": "flag", "n/a": "not_applicable"}  # report's word -> database's word
TO_STATUS = {"pass": "pass", "flag": "flag", "not_applicable": "n/a"}  # database's word -> API's word


# ---------- Check and save ----------

def check_upload(session, file_name, content):
    """Check one file, save it with its results, and return them as saved.

    A file that can't be checked is saved as failed, then FileError is raised with the plain reason.
    """
    name = Path(file_name or "").name or DEFAULT_FILE_NAME  # drop any folders: "../x.xer" -> "x.xer"
    upload = Upload(file_name=name, size_bytes=len(content), sha256=hashlib.sha256(content).hexdigest(), status=READY)
    try:
        result = run_checker(content)
    except FileError as problem:
        upload.status, upload.failure_reason = FAILED, str(problem)
        session.add(upload)
        session.commit()
        raise
    session.add(upload)
    session.flush()  # write the upload first, so its results can point to it
    save_results(session, upload.id, result)
    session.commit()  # one transaction: the upload and all its results, or nothing
    return get_upload(session, upload.id)


def run_checker(content):
    """The same steps as the command line (read, check, summarize), on a temporary copy of the file.

    The copy has a fixed name: the user's name can be "..", too long, or hold characters the disk refuses.
    """
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / DEFAULT_FILE_NAME
        path.write_bytes(content)
        return check_file(path)


def save_results(session, upload_id, result):
    """Add one FileResult's rows: each rule's number with its working, the file's issues, and the summary."""
    for position, rule in enumerate(RULES):
        codes = result.failures[rule.NAME]
        pct = percent(len(codes), result.checked)
        why = result.unavailable.get(rule.NAME)  # a check the file can't support is not applicable, whatever the numbers say
        metric = MetricResult(
            upload_id=upload_id, metric_id=rule.__name__.rsplit(".", 1)[-1], name=rule.NAME,
            dcma_section=rule.DCMA_SECTION, position=position, limit_value=rule.LIMIT, value=pct,
            numerator=len(codes), denominator=result.checked, na_reason=why,
            verdict="not_applicable" if why else TO_VERDICT[verdict(rule.NAME, pct, result.checked)])
        session.add(metric)
        session.flush()  # write the result first, so its activities can point to it
        bulk_insert(session, MetricResultActivity, [
            dict(metric_result_id=metric.id, position=n, activity_code=code) for n, code in enumerate(codes)])
    bulk_insert(session, FileIssue, [dict(upload_id=upload_id, line_number=line, severity="error", message=text) for line, text in result.broken]
                + [dict(upload_id=upload_id, line_number=line, severity="note", message=text) for line, text in result.notes])
    written_by = "ai" if result.author.startswith(AI_AUTHOR) else "code"
    session.add(Review(upload_id=upload_id, written_by=written_by, author_note=result.author,
                       facts=result.facts, points=result.points))
    if result.schedule is not None:
        save_schedule(session, upload_id, result.schedule)


# ---------- Read back ----------

def delete_upload(session, upload_id):
    """Delete one upload and everything saved with it. False if there's no upload with this ID.

    The database deletes its results, rows and schedule with it (ON DELETE CASCADE).
    """
    upload = session.get(Upload, upload_id)
    if upload is None:
        return False
    session.delete(upload)
    session.commit()
    return True


def get_upload(session, upload_id):
    """One checked upload's results, as saved. None if there's no checked upload with this ID.

    The activities behind each check are not in it: GET a check's own call for those.
    """
    upload = session.get(Upload, upload_id)
    if upload is None or upload.status != READY:
        return None
    metrics = session.exec(select(MetricResult).where(MetricResult.upload_id == upload_id)
                           .order_by(MetricResult.position)).all()
    issues = session.exec(select(FileIssue).where(FileIssue.upload_id == upload_id)
                          .order_by(FileIssue.line_number, FileIssue.id)).all()
    review = session.exec(select(Review).where(Review.upload_id == upload_id)).one()
    activities, links = load_schedule(session, upload_id)  # the largest tables: read once, shared below
    projects, schedule_overview = read_overview(session, upload_id, activities, links)
    flags = flags_by_code(session, metrics)
    rules = [rule_result(metric) for metric in metrics]
    groups, months = read_structure(session, upload_id, activities, flags, [rule.group for rule in rules])
    return CheckResult(
        upload_id=upload.id, uploaded_at=as_utc(upload.created_at), file_name=upload.file_name,
        checked=metrics[0].denominator, rules=rules,
        broken_rows=[RowNote(line=i.line_number, message=i.message) for i in issues if i.severity == "error"],
        notes=[RowNote(line=i.line_number, message=i.message) for i in issues if i.severity == "note"],
        summary=review.points, summary_author=review.author_note, projects=projects, overview=schedule_overview,
        structure=groups, months=months, previous=previous_of(session, upload),
        fix_first=fix_first(activities, links, flags, [rule.id for rule in rules]))


def get_check(session, upload_id, check_id):
    """The activities behind one check of one upload, with their logic. None if there's no such check."""
    upload = session.get(Upload, upload_id)
    if upload is None or upload.status != READY:
        return None
    metrics = session.exec(select(MetricResult).where(MetricResult.upload_id == upload_id)
                           .order_by(MetricResult.position)).all()
    metric = next((m for m in metrics if rule_id_of(m) == check_id), None)
    if metric is None:
        return None
    codes = list(session.exec(select(MetricResultActivity.activity_code).where(MetricResultActivity.metric_result_id == metric.id)
                              .order_by(MetricResultActivity.position)).all())
    flags = flags_by_code(session, metrics)
    ids = [rule_id_of(m) for m in metrics]
    rows = read_rows(*load_schedule(session, upload_id))
    return CheckActivities(id=check_id, activities=codes,
                           details=[kinded(rows[c], check_id, named(flags.get(c, ()), ids)) for c in codes if c in rows])


def flags_by_code(session, metrics):
    """{activity code: the numbers of the checks that flag it}, for the WBS roll-up and the repeat count."""
    number = {m.id: n for n, m in enumerate(metrics)}
    flags = {}
    rows = session.exec(select(MetricResultActivity.metric_result_id, MetricResultActivity.activity_code)
                        .where(col(MetricResultActivity.metric_result_id).in_(list(number)))).all()
    for metric_id, code in rows:
        flags.setdefault(code, set()).add(number[metric_id])
    return flags


def rule_id_of(metric):
    """A saved check's stable ID. A check this version of the checker no longer has keeps its file name, with hyphens."""
    rule = BY_METRIC.get(metric.metric_id)
    return rule_id(rule) if rule else metric.metric_id.replace("_", "-")


def rule_result(metric):
    """One saved check's result, without its activities."""
    rule = BY_METRIC.get(metric.metric_id)
    check_id = rule_id_of(metric)
    return RuleResult(
        id=check_id, name=metric.name, group=rule.GROUP if rule else OTHER_GROUP, measure=rule.MEASURE if rule else "percent",
        direction=rule.DIRECTION if rule else "above", severity=rule.SEVERITY if rule else 1,
        dcma_section=metric.dcma_section, limit_percent=metric.limit_value, count=metric.numerator,
        percent=round(metric.value, 1), status=TO_STATUS[metric.verdict], na_reason=metric.na_reason, kinds=kinds_of(check_id))


def list_uploads(session, limit):
    """The newest uploads first, failed ones included, with their headline numbers and every check's status."""
    uploads = session.exec(select(Upload).order_by(col(Upload.created_at).desc()).limit(limit)).all()
    ids = [u.id for u in uploads]
    metrics = session.exec(select(MetricResult).where(col(MetricResult.upload_id).in_(ids))
                           .order_by(MetricResult.position)).all()
    by_upload = {}
    for metric in metrics:  # group each upload's check results
        by_upload.setdefault(metric.upload_id, []).append(metric)
    projects = {}
    for project in session.exec(select(ScheduleProject).where(col(ScheduleProject.upload_id).in_(ids)).order_by(ScheduleProject.id)).all():
        projects.setdefault(project.upload_id, []).append(project)  # the file's projects, the first one first
    broken = Counter(session.exec(select(FileIssue.upload_id).where(col(FileIssue.upload_id).in_(ids), FileIssue.severity == "error")).all())
    return [summary(upload, by_upload.get(upload.id, []), projects.get(upload.id, []), broken[upload.id]) for upload in uploads]


def summary(upload, metrics, projects=(), broken=0):
    """One line of the upload list."""
    ready = upload.status == READY and bool(metrics)
    project = projects[0] if projects else None
    return UploadSummary(
        upload_id=upload.id, uploaded_at=as_utc(upload.created_at), file_name=upload.file_name, status=upload.status,
        failure_reason=upload.failure_reason, checked=metrics[0].denominator if ready else None,
        flags=sum(m.verdict == "flag" for m in metrics) if ready else None,
        broken_rows=broken if ready else None, projects=len(projects) if ready else None,
        checks=[CheckStatus(id=rule_id_of(m), name=m.name, group=BY_METRIC[m.metric_id].GROUP if m.metric_id in BY_METRIC else OTHER_GROUP,
                            status=TO_STATUS[m.verdict], severity=BY_METRIC[m.metric_id].SEVERITY if m.metric_id in BY_METRIC else 1,
                            percent=round(m.value, 1), count=m.numerator, limit_percent=m.limit_value, na_reason=m.na_reason)
                for m in metrics] if ready else [],
        project=project.name if project else None, data_date=project.data_date if project else None,
        forecast_finish=project.forecast_finish if project else None, deadline=project.deadline if project else None)
