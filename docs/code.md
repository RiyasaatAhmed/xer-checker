# How the code is organized

[Back to the README](../README.md)

The folders, and every backend file's job.

## Folders

| Folder | What it holds |
|---|---|
| [`backend/`](../backend/) | The API and the checker: code, tests, the two files and Kazinex's reports |
| [`frontend/`](../frontend/) | The page where you upload a file and see where its problems are. See its [README](../frontend/README.md) |
| [`database/`](../database/) | PostgreSQL: every upload and its results. See its [README](../database/README.md) |

Each folder has its own `Dockerfile`. [`docker-compose.yml`](../docker-compose.yml) runs all three.

## The backend

The backend's code is in `backend/`, one job per file, each with its own tests in `tests/`. Steps pass plain data to each other, so each can be tested alone. The frontend's files are listed in [its README](../frontend/README.md).

| Folder or file | What it is |
|---|---|
| `main.py` | Starts the API |
| `modules/` | One folder per API feature, each with `route.py`, `schema.py`, `service.py` and `model.py`. Now: `uploads/` |
| `database/` | The database connection |
| `checker.py` | Starts the command line |
| `xer_checker/` | The checker itself, used by both |
| `xer_checker/rules/` | One file per DCMA rule |

<details>
<summary>Every file, its job and its tests</summary>

| File | Its one job | Tests |
|---|---|---|
| `main.py` | Create the API and add each module's routes | `test_main.py` |
| `modules/uploads/route.py` | The upload endpoints: answer 404, 413 or 422 on errors | `test_uploads_route.py` |
| `modules/uploads/service.py` | Check the upload, save it with its results, read saved ones back (`schema.py`) | `test_uploads_service.py` |
| `modules/uploads/model.py` | The 9 tables, described in the [database README](../database/README.md) | `test_database.py` |
| `modules/uploads/snapshot.py` | Save the schedule's rows; read back the project dates, the overview and each activity's details | `test_uploads_service.py` |
| `database/db.py` | Connect to PostgreSQL, or SQLite without Docker; create the tables | `test_database.py` |
| `reader.py` | Read a `.xer` file into tables; say why a broken one can't be checked | `test_reader.py` |
| `checks.py` | Pick the activities to check, work out their links and float, run every rule | `test_checks.py`, and `test_baseline.py` against Kazinex |
| `activity.py` | What a rule sees about one activity | |
| `schedule.py` | Read the projects, activities and links a scheduler needs to see: names, WBS, dates, float in days | `test_schedule.py` |
| `overview.py` | Count what's in the schedule: status, types, links, leads and lags, constraints, float profile | `test_overview.py`, against Kazinex |
| `structure.py` | Roll the WBS tree up: checked and flagged per group, and the dates each group's work spans | `test_structure.py` |
| `rules/*.py` | One DCMA rule each | `test_rule_*.py` |
| `facts.py` | Turn the results into the named numbers a summary may use | `test_facts.py` |
| `summary/settings.py` | Read the Gemini settings from `.env`, and check them | `test_summary_settings.py` |
| `summary/rules.py` | The rules a summary must pass; filling in the facts | `test_summary_rules.py` |
| `summary/gemini.py` | The call to Gemini: reply shape, time limit, retries | `test_summary_gemini.py` |
| `summary/writer.py` | Ask Gemini, check, retry once, or let code write it | `test_summary_writer.py` |
| `summary/prompt.md` | Gemini's instructions | |
| `report.py`, `chart.py` | Print one file's results; draw the chart | `test_report_and_chart.py` |
| `cli.py` | Run those steps for each file, and set the exit code. The API reuses its `check_file` | `test_cli.py` |

</details>
