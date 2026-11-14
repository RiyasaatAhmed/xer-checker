# First-scan audit: can a scheduler read a file's status at a glance?

**Verdict: partly.** The page answers "how many checks failed" well. A scheduler's first scan asks 5 questions. The page answers 1 of them in full, and only when the file has a deadline.

The 3 gaps that matter most:

| Gap | Seen in |
|---|---|
| **Trust:** the verdict looks the same for a damaged file as for a clean one | `broken_test.xer`: 7 broken rows, 4 activities read, "2 of 11 checks over the limit" |
| **Critical path:** the page never says what drives the finish | `example_xer_file.xer`: lowest float is 6.0 d, so no activity is at 0. Nothing calls this out |
| **Weight:** every flagged check looks equally bad | Duplicate links (4 activities) gets the same red row as High float (170) |

This file is a work list. Each issue says what was seen, why it hurts the first scan, and what to build. It follows [`ux-audit.md`](ux-audit.md), which is mostly built.

## Status: what was built

**Built on 14 Nov 2026.** Every item is in, except the parts marked Partly below.

| Item | Status | Note |
|---|---|---|
| **P0-1** trust line | Done | Broken rows, rows read with blanks and "only 4 checked" lead the verdict. A small file shows "1 of 4", not "25.0%" |
| **P0-2** driving path | Partly | "13 activities at 6.0 d float, most in Work Package 49548". The red "no path from start to finish" needs a path trace. It is not built |
| **P0-3** one bar scale | Done | Every bar ends at 10x its limit. A 0% limit has no bar |
| **P0-4** serious and minor | Done | Severity 2 or 3 is serious. A serious row has a filled flag |
| **P0-5** the worst checks | Done | Every check over the limit sits under the verdict, in Serious and Minor. The worst 3 are sentences led by their count, with why each matters. The rest are chips. The list of a check now says what to do in P6 |
| **P0-6** two projects | Partly | A project picker sets the name and dates. The checks still cover all projects together, and its tooltip says so |
| **P1-1** to **P1-9** | Done | Problem names: "No resources", "Not finish to start". High float kinds now match the float strip: 45 to 90, and over 90 |
| **P1-10** map | Partly | A legend replaced the caption. The forecast and deadline labels still stack on 2 lines |
| **P1-11** activity rows | Done | The middle square says "This activity". The "fails" badge names the checks |
| **P2-1** to **P2-6** | Done | The summary card now leads with a one-line verdict to copy |

**Decision 2 changed:** any broken row makes the results partial, not only rows in `TASK` or `TASKPRED`. A stray line names no table, so the checker can't rule one out.

**Fixed on the way:** the words for out-of-sequence work were keyed `out-of-sequence-work`. The API sends `out-of-sequence`, so the row showed the fallback words.

**Phone width:** checked at 386 px in a frame. The activity list was 5 px too wide, so the page scrolled sideways. That is fixed.

## The test: 5 questions in the first 10 seconds

A senior scheduler opens an XER and asks these, in this order.

| # | Question | Where the page answers it today | Answered? |
|---|---|---|---|
| 1 | **Trust:** can I believe these numbers? | A small "7 broken rows" link under the file name. The rows sit in the last card | No |
| 2 | **Finish:** when does it finish, against the must-finish date? | Verdict, right side: "10 days early" | Yes, when the file has a deadline |
| 3 | **Driver:** is there a critical path, and where? | Nowhere. "Lowest 6.0 d" is grey text in the float card | No |
| 4 | **Progress:** how far along, and is the status current? | Status bar in the second-last card. Data date in small grey text | No |
| 5 | **Quality:** how bad is the logic, and what do I fix first? | Check board and Fix first | Partly |

## How this was reviewed

| Item | Detail |
|---|---|
| **App** | Latest commit, run locally: the API on its own SQLite database, the frontend with Vite. The Docker images were older than the code |
| **Files** | `example_xer_file.xer` (365 checked), `CSTv2.4.xer` (133, no deadline), `broken_test.xer` (7 broken rows), `D_two_projects.xer` (2 projects), `A_columns_before_table.xer` (can't be read) |
| **Screens** | Home list, dashboard top to bottom, tooltips, broken rows. Desktop 1440 px wide. Narrow check at about 600 px, the smallest the window allowed |
| **Code read** | `Verdict`, `CheckRow`, `board.ts`, `Dashboard`, `FloatStrip`, `RecentUploads`, `HealthStrip`, `FixFirst`, `schedule.py`, `causes.py`, and the API answer |
| **Not tested** | The empty home page, light mode, keyboard use, a 20,000 activity file, a file with real negative float |

## What works: keep it

| Keep | Why |
|---|---|
| **Verdict band on top** | The first line is a count, not an opaque score |
| **Finish gap picture** | "10 days early" is big, and the strip shows it |
| **Health strip by set of checks** | "Logic 5, Float 1, Resources 1" shows where the trouble is |
| **Failing checks loud, the rest folded** | The board stays short |
| **Fix first panel** | "A12830 has nothing after it. 8 flagged activities lead only into it" is the best sentence on the page |
| **Logic chips with a red "none"** | A missing link is seen, not read |
| **Icon plus word on every status** | Works without color |

## Issues, ranked

| Rank | Meaning |
|---|---|
| **P0** | Misleads at a glance. Fix first |
| **P1** | Slows the scan, or hides an answer below the fold |
| **P2** | Polish |

### P0-1. The verdict ignores whether the file can be trusted

| | |
|---|---|
| **Seen** | `broken_test.xer` has 7 broken rows and 1 row read with blanks. Only 4 activities were checked. The verdict says "2 of 11 checks over the limit". "Missing links 25.0%, 5.0x limit" is 1 activity |
| **Why it hurts** | A scheduler reads the red count and acts on it. The real answer is "this file is damaged, the results are partial" |
| **Fix 1** | Add a trust line as the first line of the verdict: "Read 4 activities · 7 broken rows". Show it in red when rows are broken |
| **Fix 2** | When broken rows touch `TASK` or `TASKPRED`, add "Results are partial" under the count |
| **Fix 3** | Under a small number of checked activities, show the count beside every percent: "1 of 4", not "25.0%" |
| **Where** | `Verdict.tsx`, `CheckRow.tsx`. Move `FileIssues` up (see P1-6) |
| **Needs a decision** | What counts as "partial". See decision 2 |

### P0-2. No critical path signal

| | |
|---|---|
| **Seen** | `example_xer_file.xer`: lowest float is 6.0 d, and the 0 d band holds 0 activities. The critical path test says "can't be checked". Nothing else names the driving path |
| **Why it hurts** | The critical path is the first thing a scheduler looks for. With a must-finish date, P6 measures float to that date. So the driving path is the lowest-float path, likely the 6 d path in this file |
| **Fix** | One verdict line: "Driving path: N activities at the lowest float (6.0 d), in WBS X". When no path runs from start to finish, say so in red |
| **Where** | Backend: count the activities at the lowest float, and their main WBS group (`overview.py`). Frontend: `Verdict.tsx` |
| **Needs a decision** | Lowest float, or 0 float, or P6's longest path. See decision 3 |

### P0-3. Check bars use a different scale on each row

| | |
|---|---|
| **Seen** | `CSTv2.4.xer`: Missing links at 15.0% fills the whole bar. Resources at 88.7% fills about 80%. In the demo, Leads at 3.0% draws longer than Lags at 7.1% |
| **Cause** | Each bar ends at 3x its own limit. A 0% limit ends at 1.25x the value, so it always fills about 80% (`CheckRow.tsx`, `LIMIT_SPAN`, `MIN_SPAN`) |
| **Why it hurts** | The eye compares bar lengths down the column. Here the lengths mean nothing across rows |
| **Fix** | One shared axis: "times the limit", with the same scale on every row. For a 0% limit, drop the bar and show a count chip: "11 activities" |
| **Where** | `CheckRow.tsx`, `theme.css` |

### P0-4. Every flagged check carries the same weight

| | |
|---|---|
| **Seen** | "7 of 12 checks over the limit" counts Duplicate links (4 activities) the same as High float (170). All 7 rows have the same red flag |
| **Why it hurts** | The scheduler can't tell "send it back" from "tidy before the next update" |
| **Fix** | Split the count by the `severity` the API already sends: "2 serious · 5 minor". Give a serious row a stronger mark. This is not a score, so it keeps decision 1 of `ux-audit.md` |
| **Where** | `Verdict.tsx`, `CheckRow.tsx`, `board.ts` (`tally`) |
| **Needs a decision** | Which checks are serious. See decision 1 |

### P0-5. The "Worst" line mixes units and order

| | |
|---|---|
| **Seen** | "Worst: High float 9.3x, Out-of-sequence work 1, Resources 109" |
| **Why it hurts** | "9.3x", "1" and "109" are 3 different units with no labels. A check with 1 activity ranks above one with 109 |
| **Cause** | `worstFirst` sorts by severity first. The text shows a ratio, or a bare count when the limit is 0 |
| **Fix** | Give each item its unit: "9.3x limit", "1 activity", "109 activities". Order inside a severity tier by activities flagged |
| **Where** | `Verdict.tsx`, `board.ts` |

### P0-6. A second project in the file is hidden

| | |
|---|---|
| **Seen** | `D_two_projects.xer` holds PRJ-A and PRJ-B. The header and verdict show PRJ-A only. Activities of both are mixed in the list, and the ID `A1000` shows twice |
| **Why it hurts** | The scheduler thinks they are looking at one project |
| **Fix** | A "2 projects" mark in the header. Then a project picker, or one verdict per project |
| **Where** | `Dashboard.tsx`, `Verdict.tsx` (both read `projects[0]` only) |
| **Needs a decision** | See decision 4 |

### P1-1. With no deadline, the finish date loses its place

| | |
|---|---|
| **Seen** | `CSTv2.4.xer`: the headline is "No deadline set" in grey. The finish date, 20 Oct 2027, drops to small text |
| **Fix** | Headline: "Finish 20 Oct 2027". Small line under it: "No must-finish date in the file" |
| **Where** | `Verdict.tsx` |

### P1-2. The data date is small, and its age is not shown

| | |
|---|---|
| **Seen** | Demo: data date 3 Jul 2026, uploaded 14 Nov 2026, 134 days apart. `CSTv2.4.xer`: data date 1 Jan 2026. Both show as small grey text |
| **Why it hurts** | An old data date means the status is stale. A scheduler checks this before anything else in an update |
| **Fix** | Put the data date in the header, beside the project name: "Data date 3 Jul 2026 · 134 days before upload". Lead the header with the project name, then the file name |
| **Where** | `Dashboard.tsx` (header), `Verdict.tsx` |

### P1-3. Progress sits in the second-last card

| | |
|---|---|
| **Seen** | Demo: 21 complete (4.8%), 29 in progress, 385 not started. This bar is the second-last card on the page |
| **Fix** | One line in the verdict: "4.8% complete · 29 in progress". Keep the full bar below |
| **Where** | `Verdict.tsx`, data from `overview.by_status` |

### P1-4. Check names name a topic, not a problem

| | |
|---|---|
| **Seen** | A red "Resources" row means 109 activities have no resources. "Link types" means links that are not finish to start |
| **Fix** | Name the problem: "No resources", "Not finish to start". Keep the DCMA name in the tooltip |
| **Where** | `NAME` in the rule files, `frontend/src/rules.ts` |

### P1-5. Counts disagree between cards

| | |
|---|---|
| **Seen** | Demo: the Leads row says 11 activities. The file card says 18 leads. Lags: 26 activities against 29 lags |
| **Cause** | A check counts activities. The file card counts links |
| **Fix** | Say both on the row: "11 activities (18 leads)" |
| **Where** | `CheckRow.tsx` |

### P1-6. Broken rows are the last thing on the page

| | |
|---|---|
| **Seen** | `broken_test.xer`: the broken rows table sits under the summary, at the very bottom |
| **Fix** | With 1 or more broken rows, show a folded bar right under the verdict: "7 broken rows · show". Open it from the trust line (P0-1) |
| **Where** | `Dashboard.tsx` (order), `FileIssues.tsx` |

### P1-7. Fix first can't be acted on

| | |
|---|---|
| **Seen** | IDs such as `A15487` are plain text. "B10351 fails 4 checks" doesn't name the 4 checks |
| **Seen** | The Missing links check is green, while the panel heading says "One missing link, many flags" |
| **Fix** | Make each ID open its activity in the list. Name the checks: "fails High float, Lags, Leads, Link types" |
| **Fix** | Show the WBS beside each ID. The API sends it already |
| **Where** | `FixFirst.tsx`, `FlaggedActivities.tsx` |

### P1-8. The home list doesn't give status at a glance

| | |
|---|---|
| **Seen** | 16 cells per row with no set names. The Finish column shows "–" whenever there is no deadline, even with a finish date |
| **Seen** | A file that can't be read shows a 2-line red sentence in the Checks column |
| **Fix** | Put small gaps and set names over the cells, once, in the header. Show the finish date when there is no deadline |
| **Fix** | For an unreadable file, show "Can't be read", with the reason in a tooltip |
| **Fix** | Add the trust mark (P0-1) and the serious count (P0-4) to each row |
| **Where** | `RecentUploads.tsx`, `MiniStrip.tsx` |

### P1-9. The float strip's limit tick looks like the 44 d line

| | |
|---|---|
| **Seen** | The tick sits at 95% of the bar width. That is where the high float share would start at the 5% limit. It reads as "44 days starts here" |
| **Seen** | The legend reads "0 0" for the 0-day band with 0 activities |
| **Seen** | The strip's last band is "Over 90: 15". The High float list calls the same 15 "Over 135 days" |
| **Fix** | Label the tick "5% limit". Add "d" to every band name: "0 d: 0". Use one set of bands in both places |
| **Where** | `FloatStrip.tsx`, `kinds.py` |

### P1-10. The map needs a caption to be read

| | |
|---|---|
| **Seen** | The map explains 3 codes in a caption: darker cell, thin bar, grey wash. The forecast and deadline labels stack at the right edge |
| **Seen** | At about 600 px wide the timeline is gone, and only the count bars remain |
| **Fix** | Put a small legend chip beside each code in the map header. Move the deadline label below the axis |
| **Where** | `ScheduleMap.tsx`, `styles.css` |

### P1-11. Activity rows need too much decoding

| | |
|---|---|
| **Seen** | Logic chips show IDs only. The middle square means "this activity", but nothing says so |
| **Seen** | "fails 3" doesn't name the checks. The float bar and the timeline have no labels |
| **Fix** | Show the activity name on chip hover. Label the middle square "this". Name the checks in the "fails" tooltip |
| **Where** | `ActivityGroups.tsx`, `LogicChain.tsx` |

### P2: polish

| # | Seen | Fix | Where |
|---|---|---|---|
| P2-1 | **Two words for one status:** "Complete" in Status, "Finished" in "Checked and left out" | Use "Complete" in both | `FileProfile.tsx` |
| P2-2 | **The count says it twice:** "7 of 12 checks over the limit", then "7 over the limit · 5 within · 4 can't be checked" | Keep the board line, cut its first part | `CheckBoard.tsx` |
| P2-3 | **"10 days early" against what?** | "10 days before the must-finish date" in the tooltip | `Verdict.tsx` |
| P2-4 | **Execution is always grey:** 4 dashes on every file without a baseline | Fold the set into one "needs a baseline" cell | `HealthStrip.tsx` |
| P2-5 | **Summary adds little:** folded at the bottom, it repeats the board | Make it a one-line verdict to copy into an email, or drop it | `Summary.tsx` |
| P2-6 | **Small grey text:** the verdict dates are about 13 px in grey | 14 px, and check contrast in both themes | `styles.css`, `theme.css` |

## Proposed first screen

```
DEMO-001   data date 3 Jul 2026 · 134 days before upload        [ Upload ]
example_xer_file.xer · 0 broken rows · read 435 activities
┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ File reads cleanly                    Finish 6 May 2027                │
│ ⚑ 2 serious · 5 minor checks over       10 days before the must-finish   │
│   High float 9.3x limit · Out-of-       ●━━━━━━━━━━━━━━━━━━━━━│          │
│   sequence 1 activity                                                    │
│ ◆ Driving path: N activities at 6.0 d   4.8% complete · 29 in progress   │
└──────────────────────────────────────────────────────────────────────────┘
 Logic ⚑⚑⚑⚑⚑✓  Constraints ✓  Float ⚑✓  Duration ✓  Dates ✓  Resources ⚑
 Needs a baseline: 4

 Serious
 ⚑ High float        ━━━━━━━━━━━━━━━━│━━━━━━━  9.3x limit   170 activities
 ⚑ Out-of-sequence   ●                          1 activity
 Minor
 ⚑ No resources      ━━━━━━━━━━━━━━━━━━━━       109 activities
 ...
```

The trust line, the finish, the driving path and progress answer questions 1 to 4. The board answers question 5.

## Suggested build order

| Step | Items | Backend change? |
|---|---|---|
| 1 | P0-3 shared bar scale, P0-5 units in "Worst" | No |
| 2 | P0-1 trust line, P1-6 broken rows up | No |
| 3 | P0-4 serious and minor | No, `severity` is sent already |
| 4 | P1-1, P1-2, P1-3: finish, data date, progress in the verdict | No |
| 5 | P0-2 driving path | Yes: lowest-float count and WBS |
| 6 | P0-6 two projects | Yes: per-project results |
| 7 | P1-4, P1-5, P1-7 to P1-11 | Small, mostly no |
| 8 | P2 items | No |

## Decisions for the user

| # | Decision | My recommendation |
|---|---|---|
| 1 | **Serious checks.** Which checks count as serious? | Severity 2 or 3 in the API. In the demo file, that makes high float and out-of-sequence work serious, and the other 5 minor |
| 2 | **Partial results.** When does a file count as partial? | Any broken row in `TASK` or `TASKPRED` |
| 3 | **Driving path.** Lowest float, 0 float, or P6's longest path? | Lowest float. A must-finish date moves the whole path off 0, as in the demo file |
| 4 | **Two projects.** One verdict per project, or a picker? | A picker, with the first project shown. Files with 2 projects are rare |

## Rules to respect

- **Numbers:** `backend/tests/test_baseline.py` must still pass.
- **Look:** every color is a token in `frontend/src/theme.css`. A status always has an icon and a word.
- **Words:** run the `plain-writing` skill before writing any new text on the page.
- **Scale:** never render every activity. A file can hold 20,000.
