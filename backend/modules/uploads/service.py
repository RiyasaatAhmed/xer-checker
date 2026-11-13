"""Check an uploaded file, save it with its results, and read saved uploads back.

The answer is always read back from the database, so a result looks the same now and later.
"""

import hashlib  # the file's fingerprint
import tempfile  # a folder that's deleted after the check
from datetime import timezone
from pathlib import Path

from sqlmodel import col, select

from modules.uploads.model import FileIssue, MetricResult, MetricResultActivity, Review, Upload
from modules.uploads.schema import CheckResult, RowNote, RuleResult, UploadSummary
from modules.uploads.snapshot import read_schedule, save_schedule
from xer_checker.checks import percent
from xer_checker.cli import check_file
from xer_checker.reader import FileError
from xer_checker.report import verdict
from xer_checker.rules import RULES

# ---------- Constants ----------

DEFAULT_FILE_NAME = "upload.xer"  # used when the upload has no name
READY, FAILED = "ready", "failed"  # an upload's status
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
        result = run_checker(name, content)
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


def run_checker(name, content):
    """The same steps as the command line (read, check, summarize), on a temporary copy of the file."""
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / name
        path.write_bytes(content)
        return check_file(path)


def save_results(session, upload_id, result):
    """Add one FileResult's rows: each rule's number with its working, the file's issues, and the summary."""
    for position, rule in enumerate(RULES):
        codes = result.failures[rule.NAME]
        pct = percent(len(codes), result.checked)
        metric = MetricResult(
            upload_id=upload_id, metric_id=rule.__name__.rsplit(".", 1)[-1], name=rule.NAME,
            dcma_section=rule.DCMA_SECTION, position=position, limit_value=rule.LIMIT, value=pct,
            numerator=len(codes), denominator=result.checked,
            verdict=TO_VERDICT[verdict(rule.NAME, pct, result.checked)])
        session.add(metric)
        session.flush()  # write the result first, so its activities can point to it
        session.add_all(MetricResultActivity(metric_result_id=metric.id, position=n, activity_code=code)
                        for n, code in enumerate(codes))
    session.add_all(FileIssue(upload_id=upload_id, line_number=line, severity="error", message=text)
                    for line, text in result.broken)
    session.add_all(FileIssue(upload_id=upload_id, line_number=line, severity="note", message=text)
                    for line, text in result.notes)
    written_by = "ai" if result.author.startswith(AI_AUTHOR) else "code"
    session.add(Review(upload_id=upload_id, written_by=written_by, author_note=result.author,
                       facts=result.facts, points=result.points))
    if result.schedule is not None:
        save_schedule(session, upload_id, result.schedule)


# ---------- Read back ----------

def get_upload(session, upload_id):
    """One checked upload's results, as saved. None if there's no checked upload with this ID."""
    upload = session.get(Upload, upload_id)
    if upload is None or upload.status != READY:
        return None
    metrics = session.exec(select(MetricResult).where(MetricResult.upload_id == upload_id)
                           .order_by(MetricResult.position)).all()
    issues = session.exec(select(FileIssue).where(FileIssue.upload_id == upload_id)
                          .order_by(FileIssue.line_number, FileIssue.id)).all()
    review = session.exec(select(Review).where(Review.upload_id == upload_id)).one()
    projects, schedule_overview, details = read_schedule(session, upload_id)
    return CheckResult(
        upload_id=upload.id, uploaded_at=as_utc(upload.created_at), file_name=upload.file_name,
        checked=metrics[0].denominator, rules=[rule_result(session, metric, details) for metric in metrics],
        broken_rows=[RowNote(line=i.line_number, message=i.message) for i in issues if i.severity == "error"],
        notes=[RowNote(line=i.line_number, message=i.message) for i in issues if i.severity == "note"],
        summary=review.points, summary_author=review.author_note, projects=projects, overview=schedule_overview)


def rule_result(session, metric, details):
    """One saved rule result, with the activities behind it in the order the checker found them, and their details."""
    codes = session.exec(select(MetricResultActivity.activity_code)
                         .where(MetricResultActivity.metric_result_id == metric.id)
                         .order_by(MetricResultActivity.position)).all()
    return RuleResult(
        name=metric.name, dcma_section=metric.dcma_section, limit_percent=metric.limit_value,
        count=metric.numerator, percent=round(metric.value, 1), status=TO_STATUS[metric.verdict],
        activities=list(codes), details=[details[code] for code in codes if code in details])


def list_uploads(session, limit):
    """The newest uploads first, failed ones included, with their headline numbers."""
    uploads = session.exec(select(Upload).order_by(col(Upload.created_at).desc()).limit(limit)).all()
    metrics = session.exec(select(MetricResult)
                           .where(col(MetricResult.upload_id).in_([u.id for u in uploads]))).all()
    by_upload = {}
    for metric in metrics:  # group each upload's rule results
        by_upload.setdefault(metric.upload_id, []).append(metric)
    return [summary(upload, by_upload.get(upload.id, [])) for upload in uploads]


def summary(upload, metrics):
    """One line of the upload list."""
    ready = upload.status == READY and bool(metrics)
    return UploadSummary(
        upload_id=upload.id, uploaded_at=as_utc(upload.created_at), file_name=upload.file_name, status=upload.status,
        failure_reason=upload.failure_reason, checked=metrics[0].denominator if ready else None,
        flags=sum(m.verdict == "flag" for m in metrics) if ready else None)


def as_utc(moment):
    """The time marked as UTC. SQLite drops the time zone, so the browser would read UTC as local time."""
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
