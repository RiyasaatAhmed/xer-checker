# UX audit: can a scheduler see it, with 3 checks today and 25 later?

**Verdict: not yet, and the current layout will not survive 25 checks.** The page is clean and its building blocks are good. But it answers "how many activities failed a check". A scheduler asks "will we finish on time, and where is the problem?"

At 25 checks, three things break: the 3-card row, the one selected list and the payload.

This file is a work list for another session. Each item says what is wrong, what to build, and where in the code. Items are built for 25 checks and must also look right with 3.

## Status: what was built

**Built on 14 Nov 2026.** The foundation, the first screen and most of the rest are in. Items marked Partly or Not done are listed with the reason.

| Item | Status | Note |
|---|---|---|
| **F1** check record | Done | `GROUP`, `MEASURE`, `DIRECTION`, `SEVERITY`, `NEEDS` in every rule file. The API sends them |
| **F2** load one check at a time | Done | The upload answer for the 20,000 activity file was 6.4 MB. It no longer holds activities. A demo upload went from 84 KB to 23 KB |
| **F3** kinds named by the backend | Done | `xer_checker/kinds.py` |
| **F4** one link per check | Done | `/uploads/<id>/checks/<check>` |
| **F5** words keyed by ID | Done | `frontend/src/rules.ts` |
| **F6** "schedule", not "check" | Done | Home, back link, loading text |
| **A1** verdict band | Done | Includes the magnified finish gap (C4) |
| **A2** check board | Done | Strip, failing rows, two folds. Every check is a row at 6 or fewer |
| **A3** map follows the check, matrix | Done | Scope: the picked check, its set, or all. The set count is a true union. Heat uses the highest check of a set |
| **A4** float picture | Done | Eight bands, colored by closeness to critical. The one color exception is recorded in `CLAUDE.md` |
| **A5** trend | Done | Delta on each row, and "2 worse, 1 better" in the verdict. Matched by file name |
| **A6** home strip | Done | Repeat uploads of one file sit together |
| **B1** bullet row | Done | Limit tick, "9.3x limit", "none allowed" for a 0% limit |
| **B2** heat cells, progress, worst first | Done | Heat is by month of start. Progress is the share of activities finished |
| **B3** cause grouping, fix first | Partly | The Fix first panel is done. Collapsing a chain inside the list is not |
| **B4**, **B5** lighter rows, worst first | Done | Worst first is the default sort, and "fails N" badges show |
| **C1** scroll trap | Partly | Each group shows 8 rows, then "Show all". A long list still scrolls inside the page, so the trap remains for big files |
| **C2**, **C3**, **C7**, **C8**, **C9**, **C10** | Done | C8 was checked in a 390 px frame, not on a real phone |
| **C5** hover cards, **C6** share image | Not done | Both need new components. They are small, and independent of the rest |

**The checks:** 16 of the about 23 candidates are built. 12 can run on a file. 4 need a baseline or a delay test and say so. The 7 extras left out each need a limit chosen first. They are dangling activities, riding the data date, backdated actuals, started with 0% complete, remaining duration discrepancy, one-day activities and changed actual dates.

**Decisions taken:** count, not a grade. The float colors are an exception to "red only for flagged". An upload is a "schedule". Confirm the DCMA limits against PAM 200.1 before relying on the new checks.

> [!NOTE]
> **Correction to B3.** The audit guessed that one open end explained all 12 high float activities in WP 49553. Measured, only 8 lead only into `A12830`. The other 4 also feed other work, so fixing that one link does not clear them.

## Goals

| Budget | What the scheduler must know | Where |
|---|---|---|
| **3 seconds** | Will it finish on time? How many checks are over the limit? Which area is bad? | First screen, no scrolling |
| **3 minutes** | Every flagged check, where it sits in the WBS, if it is getting better, and what to fix first | One page, no reading of paragraphs |

> [!NOTE]
> The user said 25 checks in one message and 20 in another. Plan for 25 to 30. The design must hold from 3 checks to 35.

## How this was reviewed

| Item | Detail |
|---|---|
| **Persona** | A scheduler of very large projects. Scans pictures, does not read |
| **Seen in the browser** | Home page, `example_xer_file.xer` (365 checked), `CSTv2.4.xer` (133, template), `big20k.xer` (16,783). Desktop width, 1440 x 603 viewport |
| **Read in code** | `Dashboard`, `Health`, `ScheduleMap`, `FlaggedActivities`, `ActivityGroups`, `LogicChain`, `FileProfile`, `Summary`, `categories.ts`, `rules.ts`, `rules/__init__.py`, and the API answer of an upload |
| **Measured** | API answer size for the 2 largest uploads |
| **Researched** | Deltek Acumen Fuse, Oracle Primavera, SmartPM, the DCMA 14-point guide, bullet graphs, large-scorecard design |
| **Not tested** | Phone width (the window would not resize), dark mode, keyboard use, negative float with real hits |

## What breaks at 25 checks

Each row is something seen in the app or code today.

| # | What exists today | Why it breaks at 25 | Fix |
|---|---|---|---|
| 1 | **3 equal cards in one row** (`Health.tsx`) | 25 cards is 9 rows, about 1,200 px. Nothing is scannable | The check board (A2) |
| 2 | **One `selected` check drives the list** (`Dashboard.tsx`) | The reader needs groups of checks and a worst-first order, not one at a time | Groups plus the board (A2) |
| 3 | **`categorize()` knows 2 check names** (`categories.ts`). Any other name falls through to float ranges | A "Leads" check would be colored by float. Wrong picture, no error | The backend names each check's kinds (F3) |
| 4 | **Result is `count / percent / limit`, flagged when above** (`RuleResult`) | CPLI and BEI pass when at or above 0.95. Critical path test is pass or fail. Link types pass when finish to start is at least 90% | A measure type and a direction (F1) |
| 5 | **`n/a` is a quiet third state** | Baseline checks (BEI, CPLI, missed tasks) are likely `n/a` on many uploads, because the README lists baseline checks as "not yet". Resources is `n/a` without resource data. Several greyed cards is noise | A "can't check" group with reasons (A2) |
| 6 | **Every check ships all its activities in one answer** | `big20k.xer` answer is 6.4 MB. Missing links alone is 4.7 MB (about 280 bytes per activity). Ten checks flagging 16,783 activities would send roughly 45 MB (estimate) | Load one check on open (F2) |
| 7 | **Words live in `rules.ts`, keyed by display name** | 25 names to keep in step with the backend. A rename breaks the words silently | Key by a stable `id` (F1, F5) |
| 8 | **The URL does not change when a check is picked** (seen) | A scheduler cannot send a colleague "look at Leads" | One link per check (F4) |
| 9 | **The map counts flagged from all checks mixed** | With 25 checks that number means nothing | Map by check group (A3) |
| 10 | **Summary lists facts for 3 checks** | 25 checks give 25 sentences. Nobody reads that | Lead with the worst 3 (C9) |
| 11 | **"Check" means two things.** An upload is "a check" ("Recent checks", "All checks", the README). A DCMA rule is also "a check" | "5 of 25 checks over the limit" on a page called "All checks" reads wrong | Name the upload a "schedule" and keep "check" for the rule (F6) |

## What other tools do

Findings are from public pages. Vendor pages say little about layout.

| Pattern | Seen in | How it applies here |
|---|---|---|
| **Per-check score, rolled into one overall score** | Oracle Primavera Schedule Health Score | A roll-up is useful. Keep each check visible beside it |
| **One grade, with activity-level flags behind it** | SmartPM (35+ checks, letter, color or score) | Headline first, then the activities that cause it |
| **Check library grouped into sets** | Acumen Fuse (DCMA 14-Point, Schedule Quality, Logic) | Group the 25 checks. Show groups, then checks |
| **Trend across updates** | SmartPM, Acumen | Delta on each check (A5) |
| **Weights and thresholds you can change** | Oracle, SmartPM (profiles by project type) | Later. Store limits per check now, so profiles can come |
| **Compact value-against-limit bar** | Bullet graph (Stephen Few): many stack in the space of one gauge | The row format for 25 checks (B1) |
| **Group many KPIs, drill down for detail** | Dashboard design guides | The zoom levels below |
| **Small multiples for many series** | Dashboard design guides | The WBS by check-group matrix (A3) |

> [!IMPORTANT]
> **Do not build one opaque 0 to 100 score.** HKA reports that Acumen's Schedule Quality Index gave 41 (red) with the activity-based method and 88 (green) with the metric-based method, on identical results. The score depends on the method. Show a count ("5 of 25 over the limit") as the headline. If a grade is wanted, show how it is made. See decision 1.

**Gaps in the research:** No source gave a layout for a 25-check screen. The zoom-level design below is a judgement from the patterns above, not a copy of a product.

## The design: four zoom levels

The reader goes from the whole project down to one activity. Each level answers one question.

| Level | Question | Shows | Time |
|---|---|---|---|
| **0. Verdict** | Is it OK? | Finish vs deadline, "N of 25 checks over the limit", the worst 3 by name, change since last upload | 3 s |
| **1. Check board** | Which checks, which area? | A health strip of 25 cells, then only the failing checks as rows | 15 s |
| **2. Where** | Which part of the project? | WBS group by check-group matrix, and the schedule map, scoped to the picked check or group | 45 s |
| **3. Activities** | Which activities, what to fix? | Worst-first list with cause grouping, and a "fix first" panel | 3 min |

**Rule: management by exception.** Failing checks are loud. Passing checks fold into one line. Checks that cannot run fold into another, each with its reason. With 3 checks, show all 3 rows. Show everything when there are 6 or fewer.

### Level 1: the check board

| Part | What it is | Notes |
|---|---|---|
| **Health strip** | One small cell per check, in groups with gaps and group names beneath | Cell shows an icon: flag, check or dash. Words sit beside the strip: "5 over, 16 within, 4 can't check". Every cell has a label for screen readers |
| **Group labels** | Logic, Constraints, Float, Duration, Dates, Resources, Execution | Each label shows its "n over" count. Click one to scope the map and board to that group |
| **Needs attention** | One bullet row per failing check, worst first | Row: icon, name, bar with a limit tick, value, "9.3x limit", change since last upload, activity count |
| **Within the limit** | One folded line. Expands to compact rows | Same row format, smaller and grey |
| **Can't check** | One folded line. Expands to a reason each | "Needs a baseline", "No resources in the file" |

Order inside "Needs attention": ratio to limit first. A limit of 0% (negative float, leads) has no ratio, so rank those by a fixed `severity` from the backend.

### Level 2: where

| Part | What it is | Notes |
|---|---|---|
| **Matrix** | Rows are WBS groups. Columns are check groups. Cell shade is the flagged share | Small multiples: one glance shows which part of the project is bad in which way |
| **Cell value** | Use the **highest** flagged share of any check in the group | Do not add `by_rule` counts: one activity can fail 3 checks and would count 3 times. A true union needs a backend field |
| **Schedule map** | The existing map, scoped to the picked check or group | Fix: it ignores the picked check today (A3) |

## The check model (what the API must send)

One record per check. This is the foundation. The UI items depend on it.

| Field | Meaning | Example |
|---|---|---|
| `id` | Stable slug. Words and links key on it | `high-float` |
| `name` | Short label, 2 words at most | High float |
| `group` | One of the groups below | Float |
| `kind` | `percent` (share of activities), `index` (a ratio), `test` (pass or fail) | percent |
| `direction` | `above` fails, or `below` fails | above |
| `value`, `limit` | The number and its limit | 46.6, 5.0 |
| `status` | `pass`, `flag` or `na` | flag |
| `na_reason` | Why it could not run. Only when `na` | Needs a baseline |
| `severity` | Fixed rank for ties and 0% limits | 2 |
| `count` | Activities flagged. `percent` kind only | 170 |
| `dcma_section` | Where DCMA defines it | 4.6 |

Today a rule file has `NAME`, `LIMIT`, `DCMA_SECTION` and `fails()` (`rules/__init__.py`). Add the other fields as constants in each rule file, so a new check stays one file and one test.

### Candidate checks (about 23, user plans 25)

The first 14 are the DCMA 14-point assessment. The 9 extras use names from SmartPM's examples. Confirm every limit against DCMA-EA PAM 200.1 before shipping. Sources disagree on CPLI and BEI (0.95 or 1.0).

| Group | Checks | Done today | Data needed |
|---|---|---|---|
| **Logic** | Missing links (1), Leads (2), Lags (3), Link types (4). Extras: dangling activities, duplicate links, out-of-sequence work | Missing links | Leads, lags, link types are counted in the overview already. Out-of-sequence needs actual dates |
| **Constraints** | Hard constraints (5) | No | Counted in the overview |
| **Float** | High float (6), Negative float (7) | Both | In the file |
| **Duration** | Long durations (8). Extra: one-day activities | No | In the file |
| **Dates** | Invalid dates (9). Extras: backdated actuals, riding the data date, started with 0% complete, remaining duration discrepancy | No | Actual dates and percent complete |
| **Resources** | Resources (10) | No | Resource rows. May be `na` |
| **Execution** | Missed tasks (11), Critical path test (12), CPLI (13), BEI (14) | No | Baseline. Critical path test needs a delay simulation. Most uploads will show `na` |

> [!NOTE]
> Changed actual dates (a SmartPM extra) needs a previous upload. It is a ninth extra. Two more checks are not chosen yet.

Direction and kind differ across these. Link types and BEI pass when high. Critical path test is a yes or no. The row format must handle all three (item F1 and B1).

## The 3-second test

| # | Question | Today | After |
|---|---|---|---|
| 1 | Will it finish before the deadline? | **No.** A small pill about 360 px down | Level 0: big number |
| 2 | How many checks are over the limit? | **Partly.** 3 cards | Level 0 and the strip |
| 3 | Which area is bad? | **Partly.** All checks mixed on the map | Group labels on the strip |
| 4 | Better or worse than last time? | **No.** The data exists (3 uploads of `big20k.xer`) | Level 0 delta |
| 5 | What do I fix first? | **No.** File order | Worst-first rows |

## The 3-minute walkthrough

A scheduler should be able to do this without reading a paragraph.

| Time | Action | Supported today? |
|---|---|---|
| 0 to 3 s | Read the verdict band | No |
| 3 to 15 s | Scan the strip. See which groups hold the flags | No |
| 15 to 45 s | Click the worst check. See which WBS groups carry it, and its trend | Partly: the map ignores the check |
| 45 to 120 s | Read the worst-first list. See "fix 1 link, clear 12 flags" | No |
| 120 to 180 s | Open the 2nd and 3rd check. Copy IDs or save a picture for the meeting | Partly: copy and CSV exist |

## What already works (keep it)

| Keep | Why |
|---|---|
| **Meter with a limit tick** | One scale, one glance. Becomes the bullet row |
| **Icon plus word, never color alone** | Holds at 25 checks. Strip cells use an icon |
| **Red dashed `none` chip in the logic line** | A missing link is seen, not read. The best idea in the app |
| **Map first, list behind it** | The right order: picture, then detail |
| **Summary folded away** | Correct for this reader |
| **Fixed-height virtual list** | Holds 16,783 rows. Change the placement (C1) |

## Foundation: do these first

### F1. Give every check the same record

| | |
|---|---|
| **Problem** | `RuleResult` assumes "percent of activities, fails above a limit". Four of the 14 DCMA checks do not fit (see the table above) |
| **Fix** | Add the fields from "The check model". Keep `count`, `percent` and `limit_percent` working so the 2 locked baselines stay put |
| **Where** | `backend/xer_checker/rules/*.py`, `result.py`, `modules/uploads/schema.py`. Frontend `types.ts` |
| **Note** | A new column must be optional (CLAUDE.md). Older uploads have none of these. The UI must still open them |

### F2. Send one check's activities when it is opened

| | |
|---|---|
| **Problem** | The upload answer holds every flagged activity of every check. `big20k.xer` is 6.4 MB today (0.8 s locally) |
| **Fix** | The upload answer carries the check records and counts only. A second call returns one check's rows, with their logic. Keep the virtual list and the sort and filter |
| **Where** | `modules/uploads/route.py` and `service.py` (a new route per check). Frontend `api.ts`, `FlaggedActivities.tsx` |
| **Why first** | Every check added multiplies the answer. Fix it before check 4, not after check 25 |

### F3. Let each check name its own kinds

| | |
|---|---|
| **Problem** | `categorize()` handles "Missing links" and "Negative float" by name. Everything else is cut into 3 float ranges |
| **Fix** | Each rule file says how its activities split (for example "nothing before", "nothing after", or float bands). The frontend only draws what it is given |
| **Where** | `categories.ts`, the rule files |

### F4. One link per check

| | |
|---|---|
| **Problem** | The address stays `/uploads/<id>` when a rule is picked. `route.ts` reads only the upload ID. The README line "each check has its own link" means each upload |
| **Fix** | `/uploads/<id>/checks/<check id>`. Back and forward work. A scheduler can send the link |
| **Where** | `route.ts`, `Dashboard.tsx` |

### F6. Fix the word "check"

| | |
|---|---|
| **Problem** | An upload is "a check" in the home page, the back link and the README. A rule is also "a check". At 25 rules the clash gets loud |
| **Fix** | Call the upload a "schedule" (home title "Schedules", back link "All schedules"). Keep "check" for the rule. Update the README and `CLAUDE.md` words to match |
| **Where** | `RecentUploads.tsx`, `Dashboard.tsx` (back link), `Home.tsx`, `README.md`, `CLAUDE.md`. Run the `plain-writing` skill first |
| **Needs a decision** | See decision 6 |

### F5. Key the words by `id`

| | |
|---|---|
| **Problem** | `rules.ts` is keyed by display name |
| **Fix** | Key by `id`. Keep the fallback so a new backend check still shows plain words |
| **Where** | `rules.ts`, `Health.tsx` |

## Priority 0: the first screen

### A1. The verdict band

| | |
|---|---|
| **Problem** | The first screen is a file name, 6 small grey facts and 3 equal cards. No verdict. Finish vs deadline is a 13 px pill inside the map card |
| **Fix** | One band above everything. **Verdict:** "5 of 25 checks over the limit". **Worst 3 by name.** **Finish vs deadline:** a big number, "10 days early" or "34 days late". **Change:** "2 worse, 1 better than last upload". **Data date** |
| **Where** | `Dashboard.tsx` (new `Verdict` component). The gap is computed in `ScheduleMap.tsx:38`, move it into a shared helper |
| **Data** | `projects[0].forecast_finish`, `deadline`, `data_date` are in the API |
| **Edge case** | `CSTv2.4.xer` has no deadline. Show "No deadline set" in grey, not a blank |

### A2. The check board

| | |
|---|---|
| **Problem** | `Health.tsx` is a row of 3 cards. It cannot hold 25 |
| **Fix** | Build the board from "Level 1" above: health strip, group labels, needs-attention rows, folded passing, folded can't-check. With 6 or fewer checks, show every check as a row |
| **Where** | `Health.tsx` is replaced by `CheckBoard.tsx`, `HealthStrip.tsx` and `CheckRow.tsx` (one component per file, 300 lines at most) |
| **Edge case** | One flagged check, 24 passing: the board is one row and one line. That is correct |
| **Edge case** | All 25 flagged: the rows are sorted and the first 8 show, then "show 17 more" |

### A3. Make the map follow the picked check or group, and add the matrix

| | |
|---|---|
| **Problem** | The map counts flagged activities from all checks together. With "Missing links" picked, WP 49553 says 12 / 12 and the list says 1 |
| **Cause** | The API sends `structure[].by_rule` (for example `[1, 0, 12]`). `types.ts:21` declares it. Nothing reads it |
| **Fix** | The map reads `by_rule` for the picked check, or the highest in the picked group. Add the WBS by check-group matrix. Show the scope in the map header |
| **Where** | `ScheduleMap.tsx` (the `share` line), `Dashboard.tsx`, new `WbsMatrix.tsx` |
| **Data** | `by_rule` is enough for v1 (highest in the group). A union count per group needs the backend (`structure.py`) |

### A4. The float picture: finer buckets, honest colors

| | |
|---|---|
| **Problem 1** | The float histogram is the most schedule-relevant picture. It sits at the very bottom, under a 20-row scroll window |
| **Problem 2** | The colors invert the danger. "Over 44 days" is the loudest red. "0 days (critical)" is a small orange sliver. "Below 0 days" is a faded pink |
| **Problem 3** | Five buckets are too coarse. Near-critical work (1 to 10 days) is the buffer a scheduler watches |
| **Fix** | Keep one slim float strip on the first screen, under the board. Float is the scheduler's home view, even with 25 checks. Buckets: below 0, 0, 1 to 5, 6 to 10, 11 to 20, 21 to 44, 45 to 90, over 90. Color by float value: negative strongest, then critical, then near-critical, then neutral. Mark "over 44" with an outline and the limit tick |
| **Needs a decision** | `CLAUDE.md` says "red only for flagged". Float color by value conflicts with it. See decision 2 |
| **Where** | `FileProfile.tsx:10` (`FLOAT_TONE`), `FileProfile.tsx:48`, backend `overview.py` (`float_profile`) |

### A5. Change since the last upload

| | |
|---|---|
| **Problem** | Schedulers judge a schedule by its trend. The app shows one file alone. The home list repeats `big20k.xer` 3 times with nothing to tell the rows apart |
| **Fix** | A delta on each check row: "46.6% from 52.0%". One line in the verdict band: "2 worse, 1 better". Match uploads by project name plus file name |
| **Where** | A new call in `modules/uploads/` returns the previous upload's check values. Frontend: `CheckRow.tsx`, `Verdict` |
| **Data** | In the database already. No re-check needed |

### A6. The home list with a mini strip

| | |
|---|---|
| **Problem** | Every row says "2 over the limit" in the same red pill. Rows look identical. No project, no data date, no finish vs deadline |
| **Fix** | Replace the pill with the same 25-cell strip, small. Add finish vs deadline and the schedule's **data date**. Group repeat uploads of one file, with the strip changing across them |
| **Where** | `RecentUploads.tsx`. The list call needs each check's status and the dates |
| **Why** | Three mini meters per row would not scale to 25. A strip does |

## Priority 1: make each picture carry more

### B1. Value against limit, as one bullet row

| | |
|---|---|
| **Problem** | 46.6% against a 5% limit reads as "about half full". The reader must work out it is 9 times the limit. A 1.6% result barely differs from 0% |
| **Fix** | One row format for every check: bar, limit tick, tinted band past the limit, "9.3x limit" badge. For `below` checks (BEI, link types) the band sits on the other side. For `test` checks the row shows "Pass" or "Fail" |
| **Where** | `CheckRow.tsx`, `theme.css` |
| **Edge case** | A 0% limit has no ratio. Show the count ("0 late", "18 leads") |

### B2. The map bar as a heat strip, sorted worst first

| | |
|---|---|
| **Problem 1** | Each group bar spans its start to finish. Almost every bar covers the same Jul to Apr range, so the longest, loudest shape carries the least information |
| **Problem 2** | The bar is solid red when 25% or more is flagged (`MANY_FLAGGED`). It cannot say where in time the problem sits |
| **Problem 3** | Rows follow file order. The worst group can be row 7 |
| **Problem 4** | No progress. The file has 21 complete and 29 in progress, and the map shows none of it |
| **Fix** | Draw each bar as month cells shaded by flagged count. Add a thin progress fill (share complete). Default sort: most flagged first, with a "File order" toggle. Add a "data date" shade so past and future read at once |
| **Where** | `ScheduleMap.tsx`, `tree.ts`. Backend `structure.py` needs a per-group, per-month flagged count and a complete share |
| **Edge case** | A 20,000 activity file. Send buckets, not rows |

### B3. Group by cause, and add "fix first"

| | |
|---|---|
| **Problem** | WP 49553 lists 12 high float activities, all at 171.6 days, in one chain. The last one, `A12830`, has nothing after it, and it also sits in the Missing links list. It looks like one open end causes all 12 flags. The page shows 12 rows and hides that |
| **Fix 1** | Collapse a run of linked activities with the same float into one line: "12 in a chain, all 171.6 d, ends at A12830 (open end)" |
| **Fix 2** | A "Fix first" panel across all checks: activities that fail 3 or more checks, and single fixes that clear many flags |
| **Why it matters** | At 25 checks the same activity fails several. The panel turns 25 lists into a short fix list. This is the highest value feature, and the largest build |
| **Where** | Backend: a new analysis step (one file in `xer_checker/`, one test file). Frontend: a new row type in `ActivityGroups.tsx`, new `FixFirst.tsx` |
| **Verify first** | Confirm in code that the open end is the cause for every chain. Do not guess |

### B4. Lighten each activity line

| | |
|---|---|
| **Problem 1** | The WBS name repeats under every row, and the group header above already says it |
| **Problem 2** | The float number has no unit. The tiny bar has no scale |
| **Problem 3** | Logic chips show IDs like `A12750`. IDs mean nothing at a glance. The names sit in a hover tooltip |
| **Problem 4** | Dates are text ("15 Jul – 16 Jul 2026"). Status is in the data and not drawn |
| **Problem 5** | The group header bar is full width for a single kind and the same length for 3 rows or 102, so groups do not compare |
| **Fix** | Drop the repeated WBS line. Write "d" after float. Replace date text with a mini timeline against the data date. Add a status dot. Make the header bar proportional to the group's share, or remove it when there is one kind |
| **Where** | `ActivityGroups.tsx` (`kindbar`, `fbar`, `afloat`), `LogicChain.tsx` |

### B5. Worst-first by default, and a "fails N checks" badge

| | |
|---|---|
| **Problem** | "File order" is the default. The 4 sorts are float and ID only |
| **Fix** | Default to worst first: largest overshoot for high float, most negative first for negative float. Add a "fails 3 checks" badge on a row, and a sort by it |
| **Where** | `activitySort.ts` (`SORTS`). The badge needs each activity's check count from the backend |

## Priority 2: polish

| # | Item | Fix | Where |
|---|---|---|---|
| C1 | **Scroll trap.** The list is a fixed-height window inside a scrolling page. A trackpad swipe gets caught | Show the worst 10 per group with "show all". Or run the virtual list on the page scroll | `VirtualList.tsx`, `FlaggedActivities.tsx` |
| C2 | **435 activities, 365 checked.** The page never says what the 70 are | A one-line breakdown of the 70 left out: complete work, milestones, level of effort and WBS summaries, each with its count. Get the counts from the API first | `FileProfile.tsx:23` |
| C3 | **Small type.** The data date and forecast labels are about 11 px. Grey on white for "of checked" and "limit 5%" | 12 px minimum. Check contrast | `styles.css`, `theme.css` |
| C4 | **Forecast and deadline lines sit 16 px apart** at the right edge. The 10 day gap is a sliver | A magnified "finish vs deadline" strip in the verdict band (A1) | `ScheduleMap.tsx` (`placed`, `CLOSE`) |
| C5 | **Hover info is `title` text.** Slow, no touch support | A real hover card on map rows, strip cells and chips | `ScheduleMap.tsx`, `LogicChain.tsx` |
| C6 | **No share view.** CSV exists. A scheduler wants a picture for a meeting | "Copy as image" or PDF of the first screen | New component |
| C7 | **Zero hits tell nothing.** A passing negative float says "0 of 365" | Show "lowest float: 6 days" under it. Near-critical is what the reader wants | `CheckRow.tsx`, API field |
| C8 | **Phone layout unverified.** The CSS has 760 px rules. The map has 3 columns | Test the board, map and list at 390 px. The strip may need to wrap by group | `styles.css:101`, `styles.css:204` |
| C9 | **Summary at 25 checks.** The AI summary will list too much | The 3 worst checks and the finish gap, then stop. Update `prompt.md` and the allowed facts. Run the plain-writing skill | `backend/xer_checker/summary/` |
| C10 | **CLI chart.** It draws 3 bars per file | Draw the failing checks only, worst first. Or a strip per file | `chart.py` |

## Proposed first screen (25 checks)

```
example_xer_file.xer   DEMO-001   data date 3 Jul 2026              [ Upload ]
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚑ 5 of 25 checks over the limit            Finish 6 May 2027             │
│   worst: High float 9.3x · Leads 18 ·      10 days before the deadline   │
│   Hard constraints 4.0x                                                  │
│   ▾ 2 worse, 1 better than the last upload                               │
└──────────────────────────────────────────────────────────────────────────┘
 Logic        Constraints  Float   Duration  Dates     Resources  Execution
 ⚑⚑✓✓✓✓✓      ⚑            ⚑✓      ✓✓✓       ✓✓✓✓✓     –          – – – –
 5 over · 16 within · 4 can't check

Needs attention (5)
 ⚑ High float        ▓▓▓▓▓▓▓▓▓▓▓│▒▒   46.6%   9.3x limit   ▾ from 52.0%   170
 ⚑ Leads             ▓▓▓▓│░░░░░░░░░░    18     over 0 limit  ▲ from 12      18
 ⚑ Hard constraints  ▓▓▓▓│▒▒▒▒░░░░░░   20.0%   4.0x limit   = same         73
 ...
 ✓ Within the limit (16)  ▸          – Can't check (4)  ▸

Float of unfinished work  ▌neg ▌0 ▐▐1-5 ▐▐▐6-10 ▒▒▒11-44 ░░░░░45+ │limit

Where   [ High float ▾ ]   worst first
 WBS group      Logic  Constr  Float  Duration  Dates      heat strip + progress
 WP 49547        ▒▒     ░       ▓▓▓    ░         ░         ▓▓▒▒▓▓▓▒▒░░░░
 WP 49552        ▒      ░       ▓▓     ░         ░         ▒▓▓▓▒▒░░░

Fix first   A12830 has no successor: fixing it clears 12 flags
Activities behind: High float (170)   ...
```

The verdict, the strip, the attention rows and the float strip should fit above the fold. Estimate: about 420 px at 5 flagged checks. Measure it when built.

## Suggested build order

| Step | Items | Size | Backend change? |
|---|---|---|---|
| 1 | F1, F5 (check record and ids) | Medium | Yes, small. The 2 locked baselines must not move |
| 2 | F2 (load one check at a time), F3, F4, F6 (naming) | Medium | Yes: new route, kinds per rule |
| 3 | A3 (map follows the check) | Small | No. Data already sent |
| 4 | A1, A2, B1 (verdict, board, bullet row) | Medium to large | No, if the 3 existing checks are the test case |
| 5 | A4 (float picture), B4, B5 (lighter rows, sort) | Medium | Buckets only |
| 6 | A5, A6 (trend, home strip) | Medium | Yes: previous upload, list fields |
| 7 | New checks, one file and one test each, in the order of the candidate table | Each small, many | Yes |
| 8 | A3 matrix and B2 (heat strip, progress) | Large | Yes: per-month buckets, union counts |
| 9 | B3 (cause grouping, fix first) | Large | Yes: new analysis |
| 10 | C1 to C10 | Small each | Mostly no |

Build the board against the 3 existing checks first. It must look right with 3, then grow.

## Decisions for the user

| # | Decision | My recommendation |
|---|---|---|
| 1 | **Overall grade?** A letter or 0 to 100 score, or only a count | Count only for now. Add a grade later, with its formula shown (the 41 vs 88 finding) |
| 2 | **Float colors.** `CLAUDE.md` says "red only for flagged". Color by float value breaks that | Allow it for the float strip only, and record the exception in `CLAUDE.md` |
| 3 | **Which checks?** 25 or 20. The candidate table has about 23 | Build the DCMA 14 first, then the extras in the table's order |
| 4 | **Limits.** Confirm each against DCMA-EA PAM 200.1 (CPLI and BEI are 0.95 or 1.0 in different sources) | Take them from PAM 200.1, not from vendor pages |
| 5 | **Backend scope.** F1, F2 and the new checks change the API and add rules | Approve F1 and F2 before any new check |
| 6 | **Naming.** Rename an upload from "check" to "schedule" (F6) | Yes. Do it before the board ships, so the new screen never says both |

## Rules to respect

- **Numbers:** `backend/tests/test_baseline.py` must still pass. No change may move a locked number.
- **Look:** every color and shape is a token in `frontend/src/theme.css`. A status always has an icon and a word.
- **Files:** one component per file, 300 lines at most.
- **Words:** copy around the numbers lives in `frontend/src/rules.ts`. Run the `plain-writing` skill before writing any text.
- **Scale:** never render every activity. A file can hold 20,000.
- **New checks:** a new rule is one file in `xer_checker/rules/`, added to `RULES`, with its own `tests/test_rule_<name>.py`.
- **Database:** a new column must be optional. A required column needs Alembic first.

## Sources

- [Deltek Acumen: DCMA 14-Point Assessment metrics](https://help.deltek.com/Product/Acumen/8.11/GA/DCMA%2014%20Point%20Assessment%20Metric%20Descriptions.html)
- [Oracle Primavera: Schedule Health Score](https://docs.oracle.com/cd/E80480_01/help/en/user/149130.htm)
- [SmartPM: Schedule Quality Analysis](https://smartpm.com/features/schedule-quality-analysis)
- [SmartPM: DCMA 14-point check vs SmartPM's 35 metrics](https://smartpm.com/blog/dcma-14-point-check-vs-smartpms-35-metrics)
- [HKA: Acumen Fuse Schedule Quality Index method](https://www.hka.com/article/acumen-fuse-schedule-quality-index-method/)
- [Tensix: Acumen Fuse metrics](https://tensix.com/acumen-fuse-metrics/)
- [Tensix: displaying the critical path in Primavera P6](https://tensix.com/displaying-the-critical-path-in-primavera-p6/)
- [ScheduleReader: DCMA 14-point assessment checklist (PDF)](https://www.schedulereader.com/wp-content/uploads/2026/07/DCMA-14-Point-Assessment-Checklist-ScheduleReader.pdf)
- [Bullet graph (Wikipedia)](https://en.wikipedia.org/wiki/Bullet_graph)
- [Dundas: dashboard design, too much data, too little information](https://dundas.com/support/learning/blog/dashboard-design-too-much-data-too-little-information)
