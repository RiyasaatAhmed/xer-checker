# Validation: how the numbers are tested

[Back to the README](../README.md)

Every number is compared with Kazinex on each test run.

**Kazinex is our source of truth.** [Kazinex](https://www.kazinex.com/) is an independent P6 schedule checker. We ran both files through it. Its reports, in [`backend/results-from-kazinex/`](../backend/results-from-kazinex/), are the baseline our results must agree with.

**[`test_baseline.py`](../backend/tests/test_baseline.py) compares them on every test run.** It reads Kazinex's reports directly, and fails when any of these breaks:

| Test | Fails when |
|---|---|
| Our numbers equal the [Results](results.md) table | a change moves any number |
| Kazinex flags every activity we flag | we flag an activity Kazinex doesn't |
| Every extra activity Kazinex flags is one DCMA leaves out | Kazinex flags real work we missed |
| Our float in days equals Kazinex's, for all 272 high-float activities it lists | float is read or converted wrong |
| Kazinex counts the same lead, lag and long-lag links, and lists the same ones with the same lag in days | a link or its lag is read wrong |
| We flag the later activity of each of those links, when DCMA checks it | leads, lags or long lags flag the wrong activity |

[`test_overview.py`](../backend/tests/test_overview.py) does the same for "What's in the files": links, the finish-to-start share, leads, lags, start-to-finish links and constraints, against Kazinex's Logic and Constraint sheets.

**Before anything ships:**

1. Add the feature.
2. Run the tests. They need no key, internet or database: Gemini's replies and the backend are faked, and each test gets its own empty database.
   ```
   cd backend && pip install -r requirements-dev.txt && pytest
   cd frontend && npm install && npm test
   ```
3. **Pass:** no number moved. **Fail:** a number changed, so we find the bug and fix it before it reaches a client.

**Why Kazinex counts more:** it checks every activity. DCMA leaves out finished, level-of-effort, WBS summary and milestone activities.

| | `CSTv2.4.xer` | `example_xer_file.xer` |
|---|---|---|
| All activities (Kazinex) | 145 | 435 |
| Checked by DCMA (this checker) | 133 | 365 |

Every extra activity Kazinex flags is one DCMA leaves out:

| File | Check | Kazinex | This checker | Extra activities in Kazinex |
|---|---|---|---|---|
| `CSTv2.4.xer` | Missing links | 21 | 20 | 1 level-of-effort activity |
| `CSTv2.4.xer` | High float | 79 | 78 | 1 finish milestone |
| `example_xer_file.xer` | Missing links | 46 | 6 | 27 finish milestones, 10 WBS summaries, 3 finished activities |
| `example_xer_file.xer` | High float | 193 | 170 | 21 finish milestones, 2 WBS summaries |

- **Negative float:** neither finds any.

**Leads, lags and long lags count links in Kazinex, and activities here.** Kazinex lists each link under its earlier activity. We flag the later one, as DCMA counts the activity a lead or lag delays. The links themselves are the same:

| File | Check | Kazinex (links) | This checker (activities) | Why the counts differ |
|---|---|---|---|---|
| `CSTv2.4.xer` | Lags | 1 | 1 | They don't |
| `example_xer_file.xer` | Leads | 18 | 11 | 6 activities have 2 lead links into them. 1 is a finish milestone |
| `example_xer_file.xer` | Lags | 29 | 26 | 2 finish milestones and 1 finished activity |
| `example_xer_file.xer` | Long lags | 10 | 8 | 2 finish milestones |

- **Leads limit:** Kazinex's own leads check allows 5% of links. DCMA allows none, as does Kazinex's negative lag check, which lists all 18.
- **Percentages differ** for the same reason: 79 of 145 is 54.5%, and 78 of 133 is 58.6%.
- **Missing-links limit:** Kazinex uses 0%. DCMA uses 5%.
