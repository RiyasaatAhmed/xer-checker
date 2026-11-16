"""Which checks can run on a file, and why not when one can't.

A check names what it needs in NEEDS (see rules/__init__.py). A file that lacks it gets the plain
reason below instead of a result. The checker never guesses.
"""

from .dates import date

# ---------- Constants ----------

NO_BASELINE = "Needs a baseline schedule. The checker reads the current file only."
NO_DELAY_TEST = "Needs a delay test that the checker can't run yet."
NO_RESOURCES = "The file has no resource assignments."
NO_DATA_DATE = "The file has no data date."
NO_ACTUAL_DATES = "The file has no actual dates."
ACTUAL_START = "act_start_date"  # the TASK column a P6 export always writes, blank or not


def data_dates(tables):
    """{project ID: its data date}, from PROJECT.last_recalc_date. A project with a blank or bad date is left out."""
    found = {p["proj_id"]: date(p.get("last_recalc_date")) for p in tables.get("PROJECT", []) if "proj_id" in p}
    return {proj: moment for proj, moment in found.items() if moment}


def reasons(tables):
    """{NEEDS key: the reason the file can't satisfy it}. A key missing from it is satisfied."""
    out = {"baseline": NO_BASELINE, "delay test": NO_DELAY_TEST}  # no file satisfies these yet
    if not tables.get("TASKRSRC"):
        out["resources"] = NO_RESOURCES
    if not data_dates(tables):
        out["data date"] = NO_DATA_DATE
    if not any(ACTUAL_START in task for task in tables.get("TASK", [])):  # the column is missing, not just blank
        out["actual dates"] = NO_ACTUAL_DATES
    return out


def unavailable(rules, tables):
    """{check name: reason} for each rule that can't run on this file."""
    why = reasons(tables)
    return {rule.NAME: why[rule.NEEDS] for rule in rules if rule.NEEDS in why}
