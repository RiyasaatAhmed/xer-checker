# The API

[Back to the README](../README.md)

The endpoints the page uses, and what they answer.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/uploads` | Checks one `.xer` file, sent as the form field `file`, and saves it |
| `GET` | `/api/uploads/progress/{progress_id}` | How far an upload has got. The page names its upload with the `X-Progress-Id` header |
| `GET` | `/api/uploads` | The 20 newest uploads, failed ones included |
| `GET` | `/api/uploads/{upload_id}` | One saved upload's results |
| `GET` | `/api/uploads/{upload_id}/checks/{check_id}` | The activities behind one check, with their logic. The page loads them when a check is opened |
| `DELETE` | `/api/uploads/{upload_id}` | Deletes one upload and its results. Answers 204 |
| `GET` | `/` | Answers `{"status": "ok"}` when the API is up |
| `GET` | `/docs` | A page to try each endpoint in the browser |

```
curl -F "file=@backend/data/CSTv2.4.xer" http://localhost:8000/api/uploads
```

**The answer** has the same results as the command line:

| Field | What it holds |
|---|---|
| `upload_id`, `uploaded_at` | Open it again with `GET /api/uploads/{upload_id}` |
| `checked` | Unfinished work activities checked |
| `rules` | One entry per check: its set, DCMA section, limit, count, percent and status (`pass`, `flag` or `n/a`). The activities are in the check's own call |
| `sets` | Per set of checks, the activities that fail at least one check in it, each counted once |
| `broken_rows`, `notes` | Rows that couldn't be read, or were read with blanks, each with its line number |
| `summary`, `summary_author` | The short points, and who wrote them |
| `projects` | Each P6 project's data date, planned start, forecast finish and deadline |
| `overview` | What's in the file, counted: activities by status and type, links by type, leads, lags, constraints, the float profile |
| `structure`, `months` | The WBS tree, each group with its checked and flagged counts, flagged per check, and the months its flagged work starts |
| `fix_first` | The open ends behind many flags, and the activities that fail the most checks |
| `previous` | The last earlier upload of the same file, to show what changed |

**It's read back from the database**, so a result looks the same now and later.

| Status | When |
|---|---|
| `200` | The file was checked and saved |
| `204` | The upload was deleted |
| `404` | No checked upload has this ID |
| `413` | The file is over 500 MB |
| `422` | The file can't be checked, with the reason: `can't be checked: the file is empty`. It's saved as failed, with that reason |
