"""Which checks can run on a file (xer_checker/availability.py), and the reason when one can't."""

from xer_checker.availability import data_dates, unavailable
from xer_checker.rules import RULES

PROJECT = {"proj_id": "P1", "last_recalc_date": "2026-07-03 08:00"}


def names(tables):
    return set(unavailable(RULES, tables))


def test_baseline_and_delay_checks_never_run_yet():
    assert {"Missed tasks", "Critical path test", "CPLI", "BEI"} <= names({"PROJECT": [PROJECT], "TASKRSRC": [{"task_id": "1"}]})


def test_resources_need_assignments_in_the_file():
    assert "Resources" in names({"PROJECT": [PROJECT]})
    assert "Resources" not in names({"PROJECT": [PROJECT], "TASKRSRC": [{"task_id": "1"}]})


def test_invalid_dates_need_a_data_date():
    assert unavailable(RULES, {"PROJECT": [{"proj_id": "P1", "last_recalc_date": ""}]})["Invalid dates"] == "The file has no data date."
    assert "Invalid dates" not in names({"PROJECT": [PROJECT]})


def test_a_project_with_a_bad_date_is_left_out():
    assert data_dates({"PROJECT": [PROJECT, {"proj_id": "P2", "last_recalc_date": "soon"}]}).keys() == {"P1"}
