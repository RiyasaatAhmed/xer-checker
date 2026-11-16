# Results: what the numbers mean

[Back to the README](../README.md)

The checks' results on the 2 public files, explained row by row.

| File | Activities checked | Broken rows | Missing links | Leads | Lags | Long lags | Negative float | High float |
|---|---|---|---|---|---|---|---|---|
| `CSTv2.4.xer` | 133 | 0 | 20 (15.0%) | 0 | 1 (0.8%) | 0 | 0 | 78 (58.6%) |
| `example_xer_file.xer` | 365 | 0 | 6 (1.6%) | 11 (3.0%) | 26 (7.1%) | 8 (2.2%) | 0 | 170 (46.6%) |

These 6 checks are matched to Kazinex on every test run, in [Validation](validation.md). The demo on the home page shows 5 of them.

**What the numbers mean:**

| | `CSTv2.4.xer` (template, not started) | `example_xer_file.xer` (demo, partly finished) |
|---|---|---|
| Broken rows | None. | None. One calendar spans 100 lines inside quotes, and it's read correctly. |
| Missing links | All 20 are placeholder rows from the MassDOT template. No real work activity is missing a link. | 6 activities have nothing after them. Under the 5% limit. |
| Leads | None. | 11 activities have a link with a lead into them. DCMA allows none, so this is a flag. |
| Lags | 1 activity has a link with a lag into it. Under the 5% limit. | 26 activities have a link with a lag into them. Over the 5% limit. |
| Long lags | None. | 8 activities have a lead or lag of 10 working days or more into them. Under the 5% limit. |
| Negative float | None. The lowest float is 0 days, on the critical path. | None. Every unfinished activity has at least 6 days of float. The forecast finish, 6 May 2027, is before the 16 May deadline. |
| High float | 20 of the 78 are the same placeholder rows. | 170 activities have more than 44 days of float. |

> [!NOTE]
> DCMA treats a number over its limit as a flag: a reason to look closer, not a failed schedule.

**What's in the files**, as the file profile at the foot of each report shows it. These are facts, not pass or fail:

| | `CSTv2.4.xer` | `example_xer_file.xer` |
|---|---|---|
| Activities | 145, all not started | 435: 385 not started, 29 in progress, 21 complete |
| Links, one per pair | 194: 166 finish to start (85.6%) | 551: 451 finish to start (81.9%) |
| Leads and lags | 0 leads, 1 lag | 18 leads, 29 lags |
| Constraints | 5 | 2 |
| Forecast finish vs deadline | 20 Oct 2027; no deadline set | 6 May 2027, 10 days before the 16 May deadline |

The link and constraint figures equal Kazinex's, to the last decimal. The demo file links 4 pairs of activities twice; each pair counts once, using its later row, as Kazinex does.
