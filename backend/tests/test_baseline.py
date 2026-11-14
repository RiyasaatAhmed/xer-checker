"""The baseline: our results on the two real files, checked against Kazinex's reports on every run.

Kazinex checks every activity in a file. DCMA leaves some out (finished, LOE, WBS summaries,
milestones). So Kazinex must list every activity we flag, and each extra one must be one DCMA
leaves out. A change that moves a number, or breaks that match, fails here.

Leads and lags are links. Kazinex lists each link under its earlier activity; we flag the later one.
So for those two, Kazinex must list the same links with the same lag, and we flag each link's
later activity that DCMA checks.
"""

import re

import pytest
from helpers import ROOT
from openpyxl import load_workbook

from xer_checker.checks import DEFAULT_HOURS_PER_DAY, FINISHED, NOT_CHECKED_TYPES, check, number
from xer_checker.reader import read_xer
from xer_checker.schedule import read_schedule

# ---------- Constants ----------

KAZINEX_DIR = ROOT / "results-from-kazinex"  # Kazinex's reports, one .xlsx per file, unchanged
KAZINEX_SHEETS = {  # our check -> the Kazinex sheet that holds the same check
    "Missing links": "Logic-Missing Logic",
    "Negative float": "Logic-Negative Float Check",
    "High float": "Logic-High Float",
}
LINK_SHEETS = {  # our link check -> the Kazinex sheet that lists the same links, under DCMA's limit
    "Leads": "Logic-Negative Lag Check",  # its 0 limit lists every lead; Kazinex's "Leads Check" allows 5% and lists none
    "Lags": "Logic-Lags Check",
}
AFFECTED_BLOCK = "Affected Activities"  # Kazinex lists flagged activities under "Issue N - Affected Activities"
FLOAT_TOLERANCE = 0.01  # Kazinex shows float in days with 2 decimals
LAG_TOLERANCE = 0.01  # Kazinex shows lag in days on the earlier activity's calendar

# The numbers in the README. Changing one needs a reason.
EXPECTED = {  # file: (checked, missing links, negative float, high float, leads, lags)
    "CSTv2.4.xer": (133, 20, 0, 78, 0, 1),
    "example_xer_file.xer": (365, 6, 0, 170, 11, 26),
}
FILES = list(EXPECTED)
CHECKS = list(KAZINEX_SHEETS)
NUMBERED = CHECKS + list(LINK_SHEETS)  # the checks in EXPECTED, in its order


# ---------- Reading the files ----------

def our_results(file_name):
    """Our tables and flagged activities for one file in data/."""
    tables, broken, _ = read_xer(ROOT / "data" / file_name)
    checked, failures, problems = check(tables)
    return tables, broken, checked, failures, problems


def kazinex_flags(file_name, check_name):
    """{activity code: Kazinex's value} for one check: float in days for high float, else the count."""
    sheet = load_workbook(KAZINEX_DIR / file_name.replace(".xer", ".xlsx"), read_only=True)[KAZINEX_SHEETS[check_name]]
    flags, header = {}, None
    for row in sheet.iter_rows(values_only=True):
        if row[0] and AFFECTED_BLOCK in str(row[0]):  # a list of activities starts
            header = "next"
        elif header == "next":  # its column names
            header = row
        elif header and row[0]:  # one flagged activity
            flags[str(row[0])] = dict(zip(header, row)).get("Impact Value")
        else:  # a blank row ends the list
            header = None
    return flags


# ---------- Our numbers haven't moved ----------

@pytest.mark.parametrize("file_name", FILES)
def test_numbers_match_the_readme(file_name):
    _, broken, checked, failures, problems = our_results(file_name)
    assert (broken, problems) == ([], [])
    assert (checked, *(len(failures[name]) for name in NUMBERED)) == EXPECTED[file_name]


# ---------- They agree with Kazinex ----------

@pytest.mark.parametrize("file_name", FILES)
@pytest.mark.parametrize("check_name", CHECKS)
def test_kazinex_flags_every_activity_we_flag(file_name, check_name):
    _, _, _, failures, _ = our_results(file_name)
    assert set(failures[check_name]) <= set(kazinex_flags(file_name, check_name))


@pytest.mark.parametrize("file_name", FILES)
@pytest.mark.parametrize("check_name", CHECKS)
def test_each_extra_activity_in_kazinex_is_one_dcma_leaves_out(file_name, check_name):
    tables, _, _, failures, _ = our_results(file_name)
    by_code = {t["task_code"]: t for t in tables["TASK"]}
    extra = set(kazinex_flags(file_name, check_name)) - set(failures[check_name])
    not_left_out = [code for code in extra
                    if by_code[code]["status_code"] != FINISHED and by_code[code]["task_type"] not in NOT_CHECKED_TYPES]
    assert not_left_out == []


@pytest.mark.parametrize("file_name", FILES)
def test_float_in_days_matches_kazinex(file_name):
    tables, _, _, _, _ = our_results(file_name)
    hours_per_day = {c["clndr_id"]: number(c.get("day_hr_cnt", "")) or DEFAULT_HOURS_PER_DAY for c in tables["CALENDAR"]}
    by_code = {t["task_code"]: t for t in tables["TASK"]}
    for code, kazinex_days in kazinex_flags(file_name, "High float").items():
        task = by_code[code]
        days = number(task["total_float_hr_cnt"]) / hours_per_day[task["clndr_id"]]
        assert days == pytest.approx(kazinex_days, abs=FLOAT_TOLERANCE), code


# ---------- Leads and lags: the same links as Kazinex ----------

def kazinex_links(file_name, check_name):
    """(how many links Kazinex counts, {(earlier code, later code): lag in days} for those it lists).

    Kazinex lists the links only when the check fails, so a passing check gives its count alone.
    """
    sheet = load_workbook(KAZINEX_DIR / file_name.replace(".xer", ".xlsx"), read_only=True)[LINK_SHEETS[check_name]]
    count, links, header = None, {}, None
    for row in sheet.iter_rows(values_only=True):
        first = str(row[0] or "")
        if first == "Summary:":  # like "29 lag relationships (5.26%, threshold: 5%)"
            count = int(re.match(r"\d+", str(row[1])).group())
        elif first.startswith("Issue") and AFFECTED_BLOCK in first:  # a list of links starts
            header = "next"
        elif header == "next":  # its column names
            header = row
        elif header and row[0]:  # one link, under its earlier activity
            values = dict(zip(header, row))
            links[(str(values["Task Code"]), str(values["Related Task"]))] = float(values["Impact Value"])
        else:  # a blank row ends the list
            header = None
    return count, links


def our_links(file_name, check_name):
    """{(earlier code, later code): lag in days} for our counted links with a lead or a lag, and the tables."""
    tables, _, _ = read_xer(ROOT / "data" / file_name)
    schedule = read_schedule(tables)
    code = {a.p6_id: a.code for a in schedule.activities}
    calendar = {t["task_id"]: t["clndr_id"] for t in tables["TASK"]}
    hours_per_day = {c["clndr_id"]: number(c.get("day_hr_cnt", "")) or DEFAULT_HOURS_PER_DAY for c in tables["CALENDAR"]}
    picked = (lambda hours: hours < 0) if check_name == "Leads" else (lambda hours: hours > 0)
    return tables, {(code[l.pred_p6_id], code[l.succ_p6_id]): abs(l.lag_hours) / hours_per_day.get(calendar[l.pred_p6_id], DEFAULT_HOURS_PER_DAY)
                    for l in schedule.links if l.line in schedule.counted and picked(l.lag_hours)}


@pytest.mark.parametrize("file_name", FILES)
@pytest.mark.parametrize("check_name", LINK_SHEETS)
def test_kazinex_counts_and_lists_the_same_links_with_the_same_lag(file_name, check_name):
    count, listed = kazinex_links(file_name, check_name)
    _, ours = our_links(file_name, check_name)
    assert count == len(ours)
    if listed:  # Kazinex lists them only when the check fails
        assert set(listed) == set(ours)
        for link, days in listed.items():
            assert ours[link] == pytest.approx(days, abs=LAG_TOLERANCE), link


@pytest.mark.parametrize("file_name", FILES)
@pytest.mark.parametrize("check_name", LINK_SHEETS)
def test_we_flag_the_later_activity_of_each_link_when_dcma_checks_it(file_name, check_name):
    tables, ours = our_links(file_name, check_name)
    _, _, _, failures, _ = our_results(file_name)
    by_code = {t["task_code"]: t for t in tables["TASK"]}
    later = {succ for _, succ in ours if by_code[succ]["status_code"] != FINISHED and by_code[succ]["task_type"] not in NOT_CHECKED_TYPES}
    assert set(failures[check_name]) == later
