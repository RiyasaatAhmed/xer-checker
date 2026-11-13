"""Reading the schedule itself (xer_checker/schedule.py): projects, activities and links."""

from datetime import datetime

from helpers import ROOT

from xer_checker.reader import read_xer
from xer_checker.schedule import date, read_schedule


def schedule_of(name):
    tables, _, _ = read_xer(ROOT / "data" / name)
    return read_schedule(tables)


def test_project_dates_come_from_the_project_table():
    [project] = schedule_of("example_xer_file.xer").projects
    assert (project.name, project.data_date, project.deadline, project.forecast_finish) == (
        "DEMO-001", datetime(2026, 7, 3), datetime(2027, 5, 16, 17), datetime(2027, 5, 6, 16, 59))


def test_an_activity_keeps_what_a_scheduler_needs_to_find_it():
    activity = next(a for a in schedule_of("CSTv2.4.xer").activities if a.code == "ContractNo_U350")
    assert activity.wbs == "Utility Notifications & Meetings"
    assert (activity.float_days, activity.duration_days, activity.checked) == (52.0, 30.0, True)  # 416 h and 240 h, 8-hour calendar
    assert (activity.start, activity.finish) == (datetime(2026, 1, 22, 8), datetime(2026, 2, 20, 16))


def test_a_pair_linked_twice_counts_once_with_its_later_row():
    schedule = schedule_of("example_xer_file.xer")
    assert (len(schedule.links), len(schedule.counted), schedule.duplicate_links) == (555, 551, 4)
    assert 87 in schedule.counted and 84 not in schedule.counted  # E10427 -> E10437: FS on line 84, FF on line 87


def test_dates_in_any_p6_export_style_and_blanks():
    assert date("2026-01-01 08:00") == datetime(2026, 1, 1, 8)
    assert date("2/12/2004 3:19:00 PM") == datetime(2004, 2, 12, 15, 19)
    assert date("") is None and date("TBD") is None
