"""The baseline: our results on the two real files, checked against Kazinex's reports on every run.

Kazinex checks every activity in a file. DCMA leaves some out (finished, LOE, WBS summaries,
milestones). So Kazinex must list every activity we flag, and each extra one must be one DCMA
leaves out. A change that moves a number, or breaks that match, fails here.
"""

import pytest
from helpers import ROOT
from openpyxl import load_workbook

from xer_checker.checks import DEFAULT_HOURS_PER_DAY, FINISHED, NOT_CHECKED_TYPES, check, number
from xer_checker.reader import read_xer

# ---------- Constants ----------

KAZINEX_DIR = ROOT / "results-from-kazinex"  # Kazinex's reports, one .xlsx per file, unchanged
KAZINEX_SHEETS = {  # our check -> the Kazinex sheet that holds the same check
    "Missing links": "Logic-Missing Logic",
    "Negative float": "Logic-Negative Float Check",
    "High float": "Logic-High Float",
}
AFFECTED_BLOCK = "Affected Activities"  # Kazinex lists flagged activities under "Issue N - Affected Activities"
FLOAT_TOLERANCE = 0.01  # Kazinex shows float in days with 2 decimals

# The numbers in the README. Changing one needs a reason.
EXPECTED = {  # file: (checked, missing links, negative float, high float)
    "CSTv2.4.xer": (133, 20, 0, 78),
    "example_xer_file.xer": (365, 6, 0, 170),
}
FILES = list(EXPECTED)
CHECKS = list(KAZINEX_SHEETS)


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
    assert (checked, *(len(failures[name]) for name in CHECKS)) == EXPECTED[file_name]


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
