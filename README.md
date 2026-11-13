# XER checker

Checks Primavera P6 schedule files (`.xer`). For each file, it:

1. **Flags broken rows**, with their line numbers.
2. **Runs 3 DCMA checks** on unfinished work:
   - **Missing links:** no link before it, or no link after it. Limit 5%.
   - **Negative float:** already late for a deadline. Limit 0%.
   - **High float:** more than 44 working days of spare time. Limit 5%.
3. **Draws one chart** of the results.
4. **Writes a short summary.** Gemini picks the words; code computes every number.

![Chart](chart.png)

**How to read the chart:**

- Each bar: the share of a file's unfinished activities a check caught.
- Dashed line: the DCMA limit.
- Over the limit: missing links in `CSTv2.4.xer` (15.0%), and high float in both files (58.6% and 46.6%).
- Under the bars: each file's summary, and who wrote it ([The AI summary](#the-ai-summary)).

## Run it

```
pip install -r requirements.txt      # matplotlib, plus google-genai and python-dotenv for the optional AI
python checker.py                    # check both files in data/ and save chart.png
python checker.py data/CSTv2.4.xer   # check one file; chart.png stays as it is
```

**Broken rows.** The two real files have none, so `broken_test.xer` is a short excerpt of
`CSTv2.4.xer`, damaged on purpose:

```
python checker.py broken_test.xer
```

```
broken_test.xer: 4 activities checked
  Broken rows: 7
    line 12: TASK total float 'TBD' is not a number
    line 13: TASK row has 15 values, expected 61
    line 14: line doesn't start with %T, %F, %R or %E: '& Surrounding Area - P1SA NB'
    line 21: TASKPRED link points to an activity that's missing or on a broken row
    ...
    line 26: no %E end marker, so the file may be cut off
  Rows read with blanks at the end: 1
    line 17: TASK row ends early; read as blank: crt_path_num
```

**A row that only ends early is read, not dropped**, as some real exports leave off empty values
at the end (like MPXJ's `TwentyFourHourCalendar.xer`, P6 8.2). It's read with blanks and listed as
a note, if nothing the checks need is missing and every value still fits its column. Checked on
10,583 rows in 8 real exports from 5 sources (P6 8.2 to 24.12).

**A file that can't be checked says why**, then the checker moves on and exits with code 1:

| File | What the checker says |
|---|---|
| Missing | `can't open the file (no such file or directory)` |
| Empty | `the file is empty` |
| A P6 XML export | `it's an XML file, not an XER export: export the schedule from P6 as XER` |
| Not a P6 export, like a PDF | `it isn't a P6 XER export: line 1 should start with ERMHDR, not '%PDF-1.7'` |
| No activities | `it has no TASK table, so there are no activities to check` |
| A column the checks need is missing | `its TASK table has no status_code column, which the checks need` |

A file with nothing to check (only finished, milestone, LOE or WBS summary activities) shows n/a,
not pass. A UTF-8 byte-order mark or a UTF-16 file is read normally.

**AI summary (optional).** Without a key, code writes it. To use Gemini, put your key from
[Google AI Studio](https://aistudio.google.com/apikey) in `.env` (gitignored):

```
cp .env.example .env
```

| Setting | What it does | In `.env.example` |
|---|---|---|
| `GEMINI_API_KEY` | Turns the AI on; empty turns it off | `<YOUR_API_KEY>` |
| `GEMINI_MODEL` | The model that writes the summaries; required with a key | `gemini-3.5-flash-lite` |
| `GEMINI_THINKING_LEVEL` | `minimal`, `low`, `medium` or `high`; empty for the model's default | `minimal` |

A small model is enough: on the same request, `gemini-3.5-flash-lite` took 1.8 seconds,
`gemini-3.8-flash` took 113. A bad setting never stops the checker; code writes the summary and
names the setting to fix.

## Validation

**Our source of truth is Kazinex.** Both files were run through [Kazinex](https://www.kazinex.com/),
an independent P6 schedule checker. Its reports, in [`results-from-kazinex/`](results-from-kazinex/),
are the baseline our results must agree with.

**[`tests/test_baseline.py`](tests/test_baseline.py) checks that on every test run.** It reads
Kazinex's reports directly and fails if any of these breaks:

| Test | Fails when |
|---|---|
| Our numbers equal the [Results](#results) table | a change moves any number |
| Kazinex flags every activity we flag | we flag an activity Kazinex doesn't |
| Every extra activity Kazinex flags is one DCMA leaves out | Kazinex flags real work we missed |
| Our float in days equals Kazinex's, for all 272 high-float activities it lists | float is read or converted wrong |

**Before anything ships:**

```
pip install pytest openpyxl
pytest
```

1. Add the feature.
2. Run the tests. They need no key or internet, because Gemini's replies are faked.
3. **Pass:** no number moved. **Fail:** a number changed, so we find the bug and fix it before it
   reaches a client.

**Why Kazinex counts more:** it checks all activities (145 and 435). DCMA leaves out finished,
LOE, WBS summary and milestone activities (133 and 365 left). Every extra one is one of these:

| File | Check | Kazinex | This checker | Extra activities in Kazinex |
|---|---|---|---|---|
| `CSTv2.4.xer` | Missing links | 21 | 20 | 1 level-of-effort activity |
| `CSTv2.4.xer` | High float | 79 | 78 | 1 finish milestone |
| `example_xer_file.xer` | Missing links | 46 | 6 | 27 finish milestones, 10 WBS summaries, 3 finished activities |
| `example_xer_file.xer` | High float | 193 | 170 | 21 finish milestones, 2 WBS summaries |

Neither finds negative float. Percentages differ for the same reason (79 of 145 = 54.5% vs 78 of
133 = 58.6%), and Kazinex's missing-links limit is 0%, where DCMA's is 5%.

## Results

| File | Activities checked | Broken rows | Missing links | Negative float | High float |
|---|---|---|---|---|---|
| `CSTv2.4.xer` | 133 | 0 | 20 (15.0%) | 0 | 78 (58.6%) |
| `example_xer_file.xer` | 365 | 0 | 6 (1.6%) | 0 | 170 (46.6%) |

| | `CSTv2.4.xer` (template, not started) | `example_xer_file.xer` (demo, partly finished) |
|---|---|---|
| Broken rows | None. | None. One calendar spans 100 lines inside quotes, and it's read correctly. |
| Missing links | All 20 are placeholder rows from the MassDOT template, so no real work activity is missing a link. | 6 activities have nothing after them. Under the 5% limit. |
| Negative float | None. The lowest float is 0 days, on the critical path. | None. Every unfinished activity has at least 6 days of float. The forecast finish, 6 May 2027, is before the 16 May deadline. |
| High float | 20 of the 78 are the same placeholder rows. | 170 activities have more than 44 days of float. |

DCMA treats a number over its limit as a flag: a reason to look closer, not a failed schedule.

## The checks

Only unfinished work activities are checked. **Float** is how many working days an activity can
slip without delaying the project; P6 stores it in hours, so it's converted with each activity's
own calendar (8 or 24 hours a day).

| Check | What it looks for | Why it matters | Limit |
|---|---|---|---|
| Missing links | No link before or no link after the activity | A loose activity can slip without moving the finish date, so the schedule can't be trusted | 5 in 100 |
| Negative float | Float below 0 days | The activity is already late for a deadline | 0 |
| High float | Float above 44 working days (about 2 months) | So much spare time can mean a link is missing | 5 in 100 |

The rules come from the DCMA 14-Point Assessment, section 4 of DCMA-EA PAM 200.1 (October 2012),
the last published version ([copy hosted by Mosaic Projects](https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf);
[plain-terms white paper](https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf)):

| Rule | From PAM 200.1 | In this checker |
|---|---|---|
| What to check (4.0) | "should exclude Completed tasks, LOE tasks, Subprojects ... and Milestones" | Skips finished, level-of-effort, WBS summary and milestone activities |
| Logic (4.1) | "missing a predecessor and/or a successor ... should not exceed 5%" | Missing links, limit 5% |
| High float (4.6) | "total float greater than 44 working days" ... "If the percentage ... exceeds 5%" | High float, over 44 days, limit 5% |
| Negative float (4.7) | "total float less than 0 working days" ... "there should not be any negative float" | Negative float, limit 0 |
| Over a limit (4.0) | "not in and of itself synonymous with failure" | Reported as FLAG, not FAIL |

**A row is broken** when it has the wrong number of values, no table above it, no `%T`/`%F`/`%R`/`%E`
marker, a link to a missing or broken activity, or a float that isn't a number; or when the file has no `%E`
end. [`reader.py`](xer_checker/reader.py) finds these; [`checks.py`](xer_checker/checks.py) runs the checks.

## The AI summary

A few one-sentence points per file. **Code owns every number; the AI only chooses the words.**

1. [`facts.py`](xer_checker/facts.py) computes named facts, like `"missing_links": "20"` or
   `"missing_links_vs_limit": "over DCMA's 5% limit"`. Code decides pass or flag, not the AI.
2. Gemini replies in a fixed JSON shape (up to 4 points), writing placeholders instead of numbers:
   `{"about": "missing_links", "text": "{missing_links} activities ({missing_links_pct}) have no link before or after them"}`.
   Instructions: [`prompt.md`](xer_checker/summary/prompt.md).
3. [`rules.py`](xer_checker/summary/rules.py) rejects a point that:

| Rule | What it stops |
|---|---|
| has a digit | a typed number, like "21" when the fact says 20 |
| spells a number or an amount (twenty, half, most, none ...) | a number in words, or "most" for 46.6% |
| has a % sign | `{missing_links}%`, which would turn a count of 20 into a made-up 20% |
| points at a fact that doesn't exist | an invented figure, like `{critical_path_days}` |
| doesn't point at any fact | a claim with nothing behind it, like "the schedule is healthy" |
| writes a fact's name without braces | "missing_links reached 25.0%" showing up in the summary |
| uses a fact from another check | the high-float count in a sentence about negative float |
| holds two sentences, a semicolon, or more than 25 words | a paragraph instead of one point with one idea |
| says "limit" or "threshold" itself | "exceed the float limit": over or within comes only from the facts |
| uses filler like "additionally", "overall", "notably" | text that sounds machine-written |

   The whole reply is rejected if a check over its limit has no sentence, so the AI can't leave
   out a flag.

4. Code fills in the real values. A rejected reply gets one retry with the reasons. If that
   fails, or the call fails, code writes the summary from the same facts, and the chart says so.
   A "busy" answer (429 or 5xx) is retried up to 3 times.

**Measured** on 30 real calls: every reply passed every rule on the first try (about 3 points
per file, 15 words each).

Gemini sees only the facts, never activity names or file text. The rules can't catch a wrong
*word*, so a person should still read a summary before it reaches a client.

## How the code is organized

`checker.py` only starts the program. The code is in `xer_checker/`, one job per file, each with
its own tests. Steps pass plain data to each other, so each can be tested alone.

| File | Its one job | Tests |
|---|---|---|
| `reader.py` | Read a `.xer` file into tables; say why a broken one can't be checked | `test_reader.py` |
| `checks.py` | The three DCMA checks | `test_checks.py`, and `test_baseline.py` against Kazinex |
| `facts.py` | Turn the results into the named numbers a summary may use | `test_facts.py` |
| `summary/settings.py` | Read the Gemini settings from `.env`, and check them | `test_summary_settings.py` |
| `summary/rules.py` | The rules a summary must pass; filling in the facts | `test_summary_rules.py` |
| `summary/gemini.py` | The call to Gemini: reply shape, time limit, retries | `test_summary_gemini.py` |
| `summary/writer.py` | Ask Gemini, check, retry once, or let code write it | `test_summary_writer.py` |
| `summary/prompt.md` | Gemini's instructions | |
| `report.py`, `chart.py` | Print one file's results; draw the chart | `test_report_and_chart.py` |
| `cli.py` | Run those steps for each file, and set the exit code | `test_cli.py` |

## The two files

- `CSTv2.4.xer`: MassDOT's schedule template for design-bid-build highway contracts (P6 23.12),
  from the Massachusetts DOT
  [Contractor Schedule Toolkit page](https://www.mass.gov/info-details/massdot-highway-contractors-schedule-toolkit)
  as "CST DBB Version 2.4.xer".
- `example_xer_file.xer`: an anonymized, partly finished demo project (P6 EPPM 24.12), from
  `tests/fixtures/example_xer_file.xer` in [Badr1600/p6-analyzer](https://github.com/Badr1600/p6-analyzer).
  MIT license, Copyright (c) 2026 TeckFuture.

Both are unchanged copies with their original names.
