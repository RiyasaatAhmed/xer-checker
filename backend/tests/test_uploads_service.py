"""Checking, saving and reading back uploads (modules/uploads/service.py)."""

import hashlib

import pytest
from helpers import ROOT
from sqlmodel import select

from modules.uploads.model import MetricResult, Review, Upload
from modules.uploads.service import check_upload, get_check, get_upload, list_uploads
from xer_checker.reader import FileError

CST = (ROOT / "data" / "CSTv2.4.xer").read_bytes()
EXAMPLE = (ROOT / "data" / "example_xer_file.xer").read_bytes()
LOCKED = ("missing-links", "negative-float", "high-float")  # the checks whose numbers the README gives


def rule(result, check_id):
    """One check of a result, by its ID."""
    return next(r for r in result.rules if r.id == check_id)


def test_real_file_gives_the_readme_numbers(db_session):
    result = check_upload(db_session, "CSTv2.4.xer", CST)
    assert (result.file_name, result.checked, result.broken_rows) == ("CSTv2.4.xer", 133, [])
    assert [(rule(result, i).name, rule(result, i).count, rule(result, i).percent, rule(result, i).status, rule(result, i).dcma_section) for i in LOCKED] == [
        ("Missing links", 20, 15.0, "flag", "4.1"), ("Negative float", 0, 0.0, "pass", "4.7"), ("High float", 78, 58.6, "flag", "4.6")]
    assert result.summary_author.startswith("code")  # the tests never call Gemini


def test_reading_it_back_gives_the_same_answer(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    assert get_upload(db_session, saved.upload_id) == saved


def test_each_number_is_saved_with_its_working(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    metric = db_session.exec(select(MetricResult).where(MetricResult.metric_id == "high_float")).one()
    assert (metric.numerator, metric.denominator, metric.verdict) == (78, 133, "flag")
    assert len(get_check(db_session, saved.upload_id, "high-float").activities) == 78
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


def test_a_file_name_the_disk_refuses_is_still_checked(db_session):
    for name in ("..", "x" * 300 + ".xer", "a\x00b.xer"):
        assert check_upload(db_session, name, CST).checked == 133


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
    assert (newest.file_name, newest.checked) == ("example_xer_file.xer", 365)
    assert (older.file_name, older.checked) == ("CSTv2.4.xer", 133)
    assert newest.flags == sum(c.status == "flag" for c in newest.checks) > 1  # the strip and the count agree
    assert [c.id for c in newest.checks][:3] == ["missing-links", "leads", "lags"]  # in report order
    assert (older.project, older.data_date.year) == ("CSTv2.4", 2026)
    assert len(list_uploads(db_session, 1)) == 1


def test_the_list_gives_each_check_its_share_and_limit(db_session):
    check_upload(db_session, "CSTv2.4.xer", CST)
    (line,) = list_uploads(db_session, 10)
    shown = {c.id: (c.percent, c.limit_percent) for c in line.checks}
    assert shown["missing-links"] == (15.0, 5) and shown["high-float"] == (58.6, 5)  # the baseline numbers


def test_times_are_sent_as_utc(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    assert saved.uploaded_at.utcoffset().total_seconds() == 0  # "...Z", not a time the browser reads as local
    assert list_uploads(db_session, 1)[0].uploaded_at.utcoffset().total_seconds() == 0


def test_the_schedule_is_saved_and_shown_with_each_number(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    [project] = saved.projects
    assert (project.name, project.deadline.date().isoformat()) == ("DEMO-001", "2027-05-16")
    assert (saved.overview.activities, saved.overview.links, saved.overview.duplicate_links) == (435, 551, 4)
    high = get_check(db_session, saved.upload_id, "high-float")
    assert [d.code for d in high.details] == high.activities  # one row per flagged activity, in order
    assert (high.details[0].code, high.details[0].float_days, high.details[0].status) == ("MS10310", 51.21, "Not started")
    assert get_upload(db_session, saved.upload_id) == saved  # read back the same


def test_each_missing_link_shows_which_side_is_missing(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    missing = get_check(db_session, saved.upload_id, "missing-links")
    assert len(missing.details) == 20
    assert all(d.predecessors == 0 or d.successors == 0 for d in missing.details)  # what the check flagged
    assert {d.kind for d in missing.details} <= {"both", "before", "after"}  # the check names its own kinds
    high = get_check(db_session, saved.upload_id, "high-float")
    assert any(d.predecessors > 0 and d.successors > 0 for d in high.details)  # high float with both links


def test_the_wbs_tree_and_each_activitys_neighbors_are_saved_and_sent(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    [root, *groups] = saved.structure
    ids = [r.id for r in saved.rules]
    assert (root.depth, root.checked) == (0, 365)
    assert [root.by_rule[ids.index(i)] for i in LOCKED] == [6, 0, 170]
    missing = get_check(db_session, saved.upload_id, "missing-links")
    high = get_check(db_session, saved.upload_id, "high-float")
    assert root.flagged >= 170 + 6 - len(set(missing.activities) & set(high.activities))  # any check flags it, counted once
    assert any(g.name == "Work Package 49552" and g.flagged > 50 for g in groups)  # most of the flags sit in one group
    row = next(d for d in missing.details if d.successors == 0 and d.predecessors > 0)  # a missing link: nothing after
    assert row.after == [] and len(row.before) == min(row.predecessors, 4)
    assert get_upload(db_session, saved.upload_id) == saved


def test_the_upload_answer_leaves_the_activities_to_each_checks_own_call(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    assert all(r.activities == [] and r.details == [] for r in saved.rules)
    assert get_check(db_session, saved.upload_id, "no-such-check") is None


def test_checks_the_file_cant_support_say_why_and_are_not_applicable(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    bei = rule(saved, "bei")
    assert (bei.status, bei.count, bei.measure, bei.direction) == ("n/a", 0, "index", "below")
    assert "baseline" in bei.na_reason


def test_each_check_knows_its_group_and_severity(db_session):
    saved = check_upload(db_session, "CSTv2.4.xer", CST)
    assert {r.group for r in saved.rules} == {"Logic", "Constraints", "Float", "Duration", "Dates", "Resources", "Execution"}
    assert all(1 <= r.severity <= 3 for r in saved.rules)


def test_a_row_says_how_many_checks_flag_it(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    rows = get_check(db_session, saved.upload_id, "high-float").details
    assert all(r.fails >= 1 for r in rows) and any(r.fails > 1 for r in rows)  # many are also in another check


def test_an_upload_shows_the_change_since_the_last_one_of_the_same_file(db_session):
    first = check_upload(db_session, "CSTv2.4.xer", CST)
    assert first.previous is None
    second = check_upload(db_session, "CSTv2.4.xer", CST)
    assert second.previous.upload_id == first.upload_id
    assert second.previous.uploaded_at.utcoffset().total_seconds() == 0  # "...Z", like uploaded_at
    assert second.previous.values["high-float"] == 58.6 and "bei" not in second.previous.values  # n/a has no value to compare
    assert check_upload(db_session, "other.xer", CST).previous is None  # matched by file name


def test_fix_first_finds_one_missing_link_behind_a_chain_of_flags(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    ends = {end.code: end.clears for end in saved.fix_first.open_ends}
    assert ends["A12830"] >= 8  # 8 of its chain lead only into it: the others also feed other work
    assert saved.fix_first.open_ends[0].clears >= ends["A12830"]  # most first
    assert saved.fix_first.repeat_offenders[0].fails >= 2


def test_fix_first_names_the_checks_each_repeat_offender_fails(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    worst = saved.fix_first.repeat_offenders[0]
    assert len(worst.checks) == worst.fails and set(worst.checks) <= {r.id for r in saved.rules}


def test_each_activity_behind_a_check_names_every_check_that_flags_it(db_session):
    saved = check_upload(db_session, "example_xer_file.xer", EXAMPLE)
    rows = get_check(db_session, saved.upload_id, "high-float").details
    assert all("high-float" in r.failed and len(r.failed) == r.fails for r in rows)


def test_the_list_counts_broken_rows_projects_and_check_severity(db_session):
    check_upload(db_session, "CSTv2.4.xer", CST)
    [line] = list_uploads(db_session, 20)
    assert (line.broken_rows, line.projects) == (0, 1)
    assert {c.id: c.severity for c in line.checks}["missing-links"] == 3
