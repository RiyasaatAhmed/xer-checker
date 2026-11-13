"""Checking, saving and reading back uploads (modules/uploads/service.py)."""

import hashlib

import pytest
from helpers import ROOT
from sqlmodel import select

from modules.uploads.model import MetricResult, Review, Upload
from modules.uploads.service import check_upload, get_upload, list_uploads
from xer_checker.reader import FileError

CST = (ROOT / "data" / "CSTv2.4.xer").read_bytes()


def test_real_file_gives_the_readme_numbers(db_session):
    result = check_upload(db_session, "CSTv2.4.xer", CST)
    assert (result.file_name, result.checked, result.broken_rows) == ("CSTv2.4.xer", 133, [])
    assert [(r.name, r.count, r.percent, r.status) for r in result.rules] == [
        ("Missing links", 20, 15.0, "flag"), ("Negative float", 0, 0.0, "pass"), ("High float", 78, 58.6, "flag")]
    assert [r.dcma_section for r in result.rules] == ["4.1", "4.7", "4.6"]
    assert result.summary_author.startswith("code")  # the tests never call Gemini


def test_reading_it_back_gives_the_same_answer(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    assert get_upload(db_session, saved.upload_id) == saved


def test_each_number_is_saved_with_its_working(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    metric = db_session.exec(select(MetricResult).where(MetricResult.metric_id == "high_float")).one()
    assert (metric.numerator, metric.denominator, metric.verdict) == (78, 133, "flag")
    assert len(saved.rules[2].activities) == 78
    upload = db_session.get(Upload, saved.upload_id)
    assert (upload.size_bytes, upload.sha256) == (len(CST), hashlib.sha256(CST).hexdigest())


def test_the_summary_is_saved_with_the_facts_it_used(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    review = db_session.exec(select(Review)).one()
    assert (review.written_by, review.points) == ("code", saved.summary)
    assert (review.facts["missing_links"], review.facts["checked"]) == ("20", "133")


def test_broken_rows_and_notes_have_their_line_numbers(db_session):
    result = check_upload(db_session, "broken_test.xer", (ROOT / "broken_test.xer").read_bytes())
    lines = [row.line for row in result.broken_rows]
    assert len(lines) == 7 and lines == sorted(lines) and lines[0] == 12  # in line order, like the report
    assert [note.line for note in result.notes] == [17]


def test_folders_in_the_file_name_are_dropped(db_session):
    assert check_upload(db_session, "../../CSTv2.4.xer", CST).file_name == "CSTv2.4.xer"


def test_a_file_that_cant_be_checked_is_saved_as_failed(db_session):
    with pytest.raises(FileError, match="the file is empty"):
        check_upload(db_session, "empty.xer", b"")
    [failed] = list_uploads(db_session, 10)
    assert (failed.status, failed.failure_reason, failed.checked) == ("failed", "the file is empty", None)
    assert get_upload(db_session, failed.upload_id) is None  # nothing to open


def test_the_list_shows_the_newest_first_with_headline_numbers(db_session):
    check_upload(db_session, "CSTv2.4.xer", CST)
    check_upload(db_session, "example_xer_file.xer", (ROOT / "data" / "example_xer_file.xer").read_bytes())
    newest, older = list_uploads(db_session, 10)
    assert (newest.file_name, newest.checked, newest.flags) == ("example_xer_file.xer", 365, 1)
    assert (older.file_name, older.checked, older.flags) == ("CSTv2.4.xer", 133, 2)
    assert len(list_uploads(db_session, 1)) == 1
