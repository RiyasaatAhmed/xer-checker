# Features

[Back to the README](../README.md)

Everything the app does, area by area.

| Area | What it does |
|---|---|
| **Reading** | Reads `.xer` files (UTF-8 or Windows-1252, values that span lines). Flags broken rows with their line numbers. Says why a file can't be checked |
| **Checks** | 21 checks, one file per rule, in 7 sets. 17 can run on a file. 4 need a baseline or a delay test and say so. 14 are DCMA's and 7 are ours. Float is converted to days with each activity's own calendar |
| **Schedule** | Reads each project's dates, every activity (name, WBS, float, duration, dates) and every link |
| **Overview** | Counts what's in the file: status, types, links, leads, lags, constraints, float profile. Matched to Kazinex |
| **Summary** | A short written summary. Gemini picks the words, code fills every number; code writes it if the AI is off or breaks a rule |
| **API** | Upload a file and follow its progress, list saved schedules, open one, delete one, and open one check's activities on its own. Clear errors: 404, 413, 422 |
| **Saving** | PostgreSQL in Docker (9 tables), SQLite without it. A result looks the same every time it's opened |
| **Home page** | The demo and an upload button when there are no schedules. Else a drop area and the saved files, newest first. Each file is a row that opens on every check, by set, drawn as the demo draws them. Each row opens its report in one click, and deletes the file after a confirm. A new upload stays on this page and opens at the top |
| **Schedule map** | The WBS tree as rows, worst first. It counts the picked check, a set of checks, or all flags. A bar per month shows how many flagged activities start then, taller for more. A thin bar shows the span and finished share. A second view is a matrix of groups against sets of checks. Click a group to list its activities |
| **Activity lines** | Flagged activities grouped by WBS group, one line each. The line shows the logic: what's before, what's after, and a red `none` where a link is missing. The list is a fixed-height window with only the lines on screen in the page, and the group name stays pinned while you scroll. Sort and filter it |
| **Scale** | Tested with a real 20,000-activity file (16,783 missing links). The page holds about 650 elements and scrolls at 60 fps. A filter updates in under 0.1 s, and a saved check reopens in under 1 s. Saving the upload takes about 10 s |
| **A schedule** | At `/report/<id>`. The verdict first: checks over the limit and how many are serious, finish against deadline, what changed since the last upload. Then the checks: a bar per set of checks, and a row for each failing check. Every bar shares one axis: the share of activities checked. Passing checks and ones that can't run fold away. Then the float bar, the map, "Fix first" and the activities behind the picked check. A small file profile and the summary come last |
| **Fix first** | One open end that many flagged activities lead only into, and a grid of the activities that fail the most checks |
| **Details** | Each schedule and each check in it has its own link. Works on phones, in dark mode and with the keyboard |
| **Proof** | Tests compare 6 checks with Kazinex on each run: 277 backend tests, 114 frontend |
| **Tooling** | `docker compose up` runs everything. `CLAUDE.md` and a writing skill keep the docs short |

**Not yet:** login (the list isn't per user), splitting a file with several projects, and the checks that need a baseline or a delay test. The leads, lags and link types checks count activities, not links.
