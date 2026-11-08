# XER checker

Checks Primavera P6 schedule files (`.xer`): flags broken rows, runs three DCMA checks
(missing links, negative float, high float) and draws one chart.

![Chart](chart.png)

<sub>Each bar is the share of a file's unfinished work activities caught by a check; the dashed
line is the DCMA limit. Both files <b>pass</b> negative float. <code>example_xer_file.xer</code> also
<b>passes</b> missing links (1.6%). Over the limit: missing links in <code>CSTv2.4.xer</code> (15.0%), and
high float in both files (58.6% and 46.6%).</sub>

## Run it

Install the one library it needs (matplotlib, for the chart):

```
pip install -r requirements.txt
```

**Check both files in `data/`** and save `chart.png`:

```
python checker.py
```

**Check one file.** Put its path after the script name. This prints the results and leaves
`chart.png` unchanged:

```
python checker.py data/CSTv2.4.xer
```

**See the broken-row check working.** The two real files have no broken rows, so
`broken_test.xer` is a short excerpt of `CSTv2.4.xer`, damaged on purpose:

```
python checker.py broken_test.xer
```

```
broken_test.xer: 3 activities checked
  Broken rows: 10
    line 12: TASK total float 'TBD' is not a number
    line 13: TASK row has 15 values, expected 61
    line 14: line doesn't start with %T, %F, %R or %E: '& Surrounding Area - P1SA NB'
    line 17: TASK row has 60 values, expected 61
    line 21: TASKPRED link points to an activity that's missing or on a broken row
    ...
    line 26: no %E end marker, so the file may be cut off
```

It catches a float typed as text, two rows with missing values, a stray line from a line
break typed into a task name, links to activities that are missing or on broken rows, and the
missing end marker.

## Results

| File | Activities checked | Broken rows | Missing links | Negative float | High float |
|---|---|---|---|---|---|
| `CSTv2.4.xer` | 133 | 0 | 20 (15.0%) | 0 | 78 (58.6%) |
| `example_xer_file.xer` | 365 | 0 | 6 (1.6%) | 0 | 170 (46.6%) |

What the results mean:

| | `CSTv2.4.xer` (template, not started) | `example_xer_file.xer` (demo, partly finished) |
|---|---|---|
| Broken rows | None. | None. One calendar is written across 100 lines inside quotes, and it's read correctly. |
| Missing links | All 20 are placeholder rows that come with the MassDOT template, so no real work activity is missing a link. | 6 activities have nothing after them. That's under the 5% limit. |
| Negative float | None. The lowest float is 0 days, on the critical path. | None. Every unfinished activity has at least 6 days of float, and the project is forecast to finish on 6 May 2027, before its 16 May deadline. |
| High float | 20 of the 78 are the same placeholder rows. | 170 activities have more than 44 days of float. |

DCMA treats a number over its limit as a flag: a reason to look closer, not a failed schedule.

## The checks

A few words first:

- **Activity:** one piece of work in the schedule, like "Pour foundation".
- **Link:** a relationship that ties one activity to another, like "B starts after A finishes".
- **Float:** how many working days an activity can slip without delaying the project.
- **Limit:** the most activities a check may catch, out of every 100.

As DCMA says, only unfinished work activities are checked. Finished activities, level-of-effort
activities, WBS summaries and milestones are left out.

| Check | What it looks for | Why it matters | Limit |
|---|---|---|---|
| Missing links | Activities with no link before them or no link after them | A loose activity can slip without moving the finish date, so the schedule can't be trusted | 5 in 100 |
| Negative float | Float below 0 days | The activity is already late for a deadline | 0 (none allowed) |
| High float | Float above 44 working days (about 2 months) | So much spare time can mean a link is missing | 5 in 100 |

Float is converted from hours to days with each activity's own calendar, because P6 stores it
in hours and a working day can be 8 hours or 24.

The checks, limits and exclusions come from the DCMA 14-Point Assessment, section 4 of DCMA's
EVMS Program Analysis Pamphlet (DCMA-EA PAM 200.1, October 2012), the last published version
of the checklist ([copy hosted by Mosaic Projects](https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf)).
[Mosaic Projects' white paper](https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf)
explains them in plain terms.

What the pamphlet says, and how this checker uses it:

| Rule | From PAM 200.1 | In this checker |
|---|---|---|
| What to check (4.0) | "should exclude Completed tasks, LOE tasks, Subprojects ... and Milestones" | Skips finished, level-of-effort, WBS summary and milestone activities |
| Logic (4.1) | "missing a predecessor and/or a successor ... should not exceed 5%" | Missing links, limit 5% |
| High float (4.6) | "total float greater than 44 working days" ... "If the percentage ... exceeds 5%" | High float, over 44 days, limit 5% |
| Negative float (4.7) | "total float less than 0 working days" ... "there should not be any negative float" | Negative float, limit 0 |
| Over a limit (4.0) | "not in and of itself synonymous with failure" | Reported as FLAG, not FAIL |

A row is broken when it has the wrong number of values, a line doesn't start with a P6 marker
(`%T`, `%F`, `%R`, `%E`), a link points to an activity that's missing or on a broken row, a float
isn't a number, or the file has no `%E` end marker.

## How the results were validated

Both files were also run through [Kazinex](https://www.kazinex.com/), an online P6 schedule
checker. Its reports are in [`results-from-kazinex/`](results-from-kazinex/).

**What matches:**

- Every activity this checker flags, Kazinex flags too.
- Float values are the same for every high-float activity Kazinex lists.
- Neither tool finds negative float in either file.

**What differs, and why:**

| File | Check | Kazinex | This checker | Extra activities Kazinex counts |
|---|---|---|---|---|
| `CSTv2.4.xer` | Missing links | 21 | 20 | 1 level-of-effort activity |
| `CSTv2.4.xer` | High float | 79 | 78 | 1 finish milestone |
| `example_xer_file.xer` | Missing links | 46 | 6 | 27 finish milestones, 10 WBS summaries, 3 finished activities |
| `example_xer_file.xer` | High float | 193 | 170 | 21 finish milestones, 2 WBS summaries |

Kazinex checks every activity in the file (145 and 435). This checker follows the DCMA rule
above and leaves out finished activities, level-of-effort activities, WBS summaries and
milestones (133 and 365 left). Every extra activity in Kazinex's count is one of those.

That's also why the percentages differ: Kazinex divides by all activities (high float: 79 of
145 = 54.5%), this checker by the activities DCMA checks (78 of 133 = 58.6%). And Kazinex's
missing-links limit is 0%, where DCMA's is 5%.

## The two files

- `CSTv2.4.xer`: MassDOT's schedule template for design-bid-build highway contracts (P6 23.12),
  published on the Massachusetts DOT
  [Contractor Schedule Toolkit page](https://www.mass.gov/info-details/massdot-highway-contractors-schedule-toolkit)
  as "CST DBB Version 2.4.xer".
- `example_xer_file.xer`: an anonymized, partly finished demo project (P6 EPPM 24.12), from
  `tests/fixtures/example_xer_file.xer` in
  [Badr1600/p6-analyzer](https://github.com/Badr1600/p6-analyzer). MIT license,
  Copyright (c) 2026 TeckFuture.

Both are unchanged copies with their original names.
