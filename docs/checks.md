# The checks

[Back to the README](../README.md)

All 21 checks, their limits, and where the rules come from.

Only unfinished work activities are checked.

**Float:** how many working days an activity can slip without delaying the project. P6 stores it in hours. The checker converts it to days with each activity's own calendar (8 or 24 hours a day).

**21 checks in 7 sets.** 14 come from DCMA, with the section numbers of PAM 200.1. 7 are ours: checks a scheduler adds.

| Set | Check | Source | Flags an activity when | Limit |
|---|---|---|---|---|
| Logic | Missing links | DCMA 4.1 | It has no predecessor, or no successor | 5% |
| Logic | Open start or finish | Ours | Its links don't drive its start, or its finish drives nothing | 5% |
| Logic | Logic loops | Ours | It's on a circular chain of links, which P6 can't schedule | 0% |
| Logic | Leads | DCMA 4.2 | A link into it has a negative lag | 0% |
| Logic | Lags | DCMA 4.3 | A link into it has a positive lag | 5% |
| Logic | Long lags | Ours, with Kazinex's limit | A link into it has a lead or lag of 10 working days or more | 5% |
| Logic | Link types (the page says "Not finish to start") | DCMA 4.4 | A link into it isn't finish to start | 10% |
| Logic | Duplicate links | Ours | Its predecessor is linked to it twice | 0% |
| Logic | Out-of-sequence work | Ours | It's in progress while a finish-to-start predecessor isn't finished | 0% |
| Constraints | Hard constraints | DCMA 4.5 | It has a hard first or second constraint | 5% |
| Float | Negative float | DCMA 4.7 | Its float is below 0 days | 0% |
| Float | High float | DCMA 4.6 | Its float is over 44 working days | 5% |
| Duration | Long durations | DCMA 4.8 | Its original duration is over 44 working days | 5% |
| Duration | Missing calendars | Ours | Its calendar isn't in the file, so its days are counted at 8 hours | 0% |
| Dates | Invalid dates | DCMA 4.9 | An actual date is after the data date, or a forecast date is before it | 0% |
| Dates | Status conflicts | Ours | Its status disagrees with its actual dates, or work in progress has none left | 0% |
| Resources | Resources (the page says "No resources") | DCMA 4.10 | It has a duration but no resource | 0% |
| Execution | Missed tasks | DCMA 4.11 | Needs a baseline | 5% |
| Execution | Critical path test | DCMA 4.12 | Needs a delay test | Pass or fail |
| Execution | CPLI | DCMA 4.13 | Needs a baseline | 0.95 |
| Execution | BEI | DCMA 4.14 | Needs a baseline | 0.95 |

**Each rule is its own file** in [`backend/xer_checker/rules/`](../backend/xer_checker/rules/), with its own tests in `backend/tests/test_rule_<name>.py`. A wrong count points straight to one file.

**To add a rule:** add its file to `rules/`, then add it to `RULES` in [`rules/__init__.py`](../backend/xer_checker/rules/__init__.py). The report, the chart, the summary and the API pick it up.

**Where the rules come from:** the DCMA 14-Point Assessment, section 4 of DCMA-EA PAM 200.1 (October 2012). It is the last published version.

- [Copy hosted by Mosaic Projects](https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf)
- [Plain-terms white paper](https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf)

| Rule | From PAM 200.1 | In this checker |
|---|---|---|
| What to check (4.0) | "should exclude Completed tasks, LOE tasks, Subprojects ... and Milestones" | Skips finished, level-of-effort, WBS summary and milestone activities |
| Logic (4.1) | "missing a predecessor and/or a successor ... should not exceed 5%" | Missing links, limit 5% |
| High float (4.6) | "total float greater than 44 working days" ... "If the percentage ... exceeds 5%" | High float, over 44 days, limit 5% |
| Negative float (4.7) | "total float less than 0 working days" ... "there should not be any negative float" | Negative float, limit 0 |
| Leads, lags, link types (4.2 to 4.4) | "# of logic links with leads" ... "# of logic links" | Counted per activity, not per link. The links match Kazinex one by one ([Validation](validation.md)) |
| High duration (4.8) | "baseline duration greater than 44 working days" | Long durations, on the original duration: the files hold no baseline |
| Resources (4.10) | "durations greater than zero have dollars or hours" | Resources, for any duration above 0. The PAM sets no limit, so the checker uses 0 |
| Over a limit (4.0) | "not in and of itself synonymous with failure" | Reported as FLAG, not FAIL |

**A row is broken when:**

- it has the wrong number of values
- it has no table above it
- it has no `%T`, `%F`, `%R` or `%E` marker
- it links to a missing or broken activity
- its float isn't a number
- or the file has no `%E` end marker

[`reader.py`](../backend/xer_checker/reader.py) finds these. [`checks.py`](../backend/xer_checker/checks.py) picks the activities to check, works out their links and float, and runs every rule.
