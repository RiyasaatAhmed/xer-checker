# Database

PostgreSQL 17. It saves every upload and its results, so any result can be opened again later.

**The backend creates the tables** when it starts. Without Docker, it uses a local SQLite file instead (`backend/xer_checker.db`, gitignored).

## The tables

| Table | One row per | Holds |
|---|---|---|
| `uploads` | file | Name, size, SHA-256 fingerprint, status (`ready` or `failed`), and the reason if it failed |
| `file_issues` | broken row or note | Line number, `error` or `note`, and a plain message |
| `metric_results` | DCMA rule, per upload | The percent, with its working: numerator and denominator. Also the limit, the DCMA section and `pass`, `flag` or `not_applicable` |
| `metric_result_activities` | activity behind a number | The activity ID, in the order the checker found it |
| `reviews` | upload | The summary, `ai` or `code`, and the exact facts it was written from |
| `schedule_projects` | P6 project in the file | Data date, planned start, deadline and forecast finish |
| `activities` | activity in the file | Activity ID, name, WBS, type, status, float and remaining duration in days, start, finish, constraint, line |
| `relationships` | link row in the file | Both activities, link type, lag, line, and whether it's counted: a pair linked twice counts its later row only |

**P6 dates are kept as P6 writes them**, site-local with no time zone, so no date moves by a day.

**Three rules:**

- **An upload never changes after it's checked.** A new file is a new upload.
- **Every number is saved with its working.** "20 of 133" can be checked; "15.0%" alone can't.
- **Deleting an upload deletes everything from it** (`ON DELETE CASCADE`).

Status and verdict columns use `CHECK` lists, so a wrong value is refused.

## Settings

`POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env`. Without them, the local defaults in `docker-compose.yml` apply. The password goes into a URL, so use letters and numbers only.

## Connect

```
docker compose exec database psql -U xer_checker xer_checker
```

```sql
SELECT file_name, status, created_at FROM uploads ORDER BY created_at DESC;
```
