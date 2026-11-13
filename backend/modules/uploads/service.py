"""Run the checker on one uploaded file, and shape its results for the API."""

import tempfile  # a folder that's deleted after the check
from pathlib import Path

from modules.uploads.schema import CheckResult, RowNote, RuleResult
from xer_checker.checks import percent
from xer_checker.cli import check_file
from xer_checker.report import verdict
from xer_checker.rules import RULES

# ---------- Constants ----------

DEFAULT_FILE_NAME = "upload.xer"  # used when the upload has no name


def check_upload(file_name, content):
    """Check one uploaded file. Raises FileError, with a plain reason, if it can't be checked."""
    name = Path(file_name or "").name or DEFAULT_FILE_NAME  # drop any folders: "../x.xer" -> "x.xer"
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / name
        path.write_bytes(content)
        result = check_file(path)  # the same steps as the command line: read, check, summarize
    return to_schema(result)


def to_schema(result):
    """A FileResult, as the API sends it."""
    rules = []
    for rule in RULES:
        codes = result.failures[rule.NAME]
        pct = percent(len(codes), result.checked)
        rules.append(RuleResult(
            name=rule.NAME, dcma_section=rule.DCMA_SECTION, limit_percent=rule.LIMIT, count=len(codes),
            percent=round(pct, 1), status=verdict(rule.NAME, pct, result.checked).lower(), activities=codes))
    return CheckResult(
        file_name=result.name, checked=result.checked, rules=rules,
        broken_rows=[RowNote(line=line, message=text) for line, text in sorted(result.broken)],  # in line order, like the report
        notes=[RowNote(line=line, message=text) for line, text in result.notes],
        summary=result.points, summary_author=result.author)
