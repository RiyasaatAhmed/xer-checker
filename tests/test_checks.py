"""The DCMA checks (xer_checker/checks.py), on tiny schedules where the right answer is known."""

import pytest

from xer_checker.checks import check, percent, within_limit


def task(task_id, float_hours="0", status="TK_NotStart", kind="TT_Task", calendar="8h"):
    """One activity, as the reader hands it over. Its code is "A" plus its ID."""
    return {"task_id": task_id, "task_code": "A" + task_id, "status_code": status, "task_type": kind,
            "total_float_hr_cnt": float_hours, "clndr_id": calendar, "_line": int(task_id)}


def link(pred, succ, line=99):
    """A link: `pred` comes first, then `succ`."""
    return {"pred_task_id": pred, "task_id": succ, "_line": line}


def schedule(tasks, links=()):
    """The tables for a schedule with an 8-hour and a 24-hour calendar."""
    calendars = [{"clndr_id": "8h", "day_hr_cnt": "8"}, {"clndr_id": "24h", "day_hr_cnt": "24"}]
    return {"TASK": list(tasks), "TASKPRED": list(links), "CALENDAR": calendars}


# ---------- What gets checked ----------

def test_only_unfinished_work_is_checked():  # DCMA 4.0 leaves the rest out
    tasks = [task("1"), task("2", status="TK_Complete"), task("3", kind="TT_Mile"), task("4", kind="TT_FinMile"),
             task("5", kind="TT_LOE"), task("6", kind="TT_WBS"), task("7", status="TK_Active")]
    checked, failures, _ = check(schedule(tasks))
    assert checked == 2
    assert failures["Missing links"] == ["A1", "A7"]


# ---------- Missing links ----------

def test_activity_needs_a_link_before_it_and_a_link_after_it():
    tables = schedule([task("1"), task("2"), task("3")], [link("1", "2"), link("2", "3")])
    _, failures, _ = check(tables)
    assert failures["Missing links"] == ["A1", "A3"]  # 1 has nothing before it, 3 has nothing after it


def test_link_to_a_missing_activity_is_a_problem_and_doesnt_count():
    tables = schedule([task("1"), task("2")], [link("1", "2", line=20), link("999", "1", line=21)])
    _, failures, problems = check(tables)
    assert problems == [(21, "TASKPRED link points to an activity that's missing or on a broken row")]
    assert failures["Missing links"] == ["A1", "A2"]  # the bad link gave activity 1 no predecessor


# ---------- Float ----------

def test_float_hours_become_days_with_the_activitys_own_calendar():
    # 360 hours is 45 days on an 8-hour calendar, but only 15 days on a 24-hour one.
    _, failures, _ = check(schedule([task("1", "360", calendar="8h"), task("2", "360", calendar="24h")]))
    assert failures["High float"] == ["A1"]


def test_negative_float_is_flagged():
    _, failures, _ = check(schedule([task("1", "-8"), task("2", "0")]))
    assert failures["Negative float"] == ["A1"]


def test_float_just_over_44_days_is_high_and_under_is_not():
    _, failures, _ = check(schedule([task("1", "360"), task("2", "344")]))  # 45 days and 43 days
    assert failures["High float"] == ["A1"]


def test_blank_float_is_skipped_and_text_is_a_problem():
    _, failures, problems = check(schedule([task("1", ""), task("2", "TBD")]))
    assert problems == [(2, "TASK total float 'TBD' is not a number")]
    assert failures["Negative float"] == [] and failures["High float"] == []


def test_unknown_calendar_falls_back_to_8_hours():
    _, failures, _ = check(schedule([task("1", "360", calendar="no-such-calendar")]))
    assert failures["High float"] == ["A1"]


# ---------- Percentages and limits ----------

def test_percent_of_nothing_is_zero():
    assert percent(0, 0) == 0 and percent(20, 133) == pytest.approx(15.04, abs=0.01)


def test_limit_is_passed_at_exactly_the_limit():  # DCMA flags only what's above it
    assert within_limit("Missing links", 5) and not within_limit("Missing links", 5.1)
    assert within_limit("Negative float", 0) and not within_limit("Negative float", 0.1)

