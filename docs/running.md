# Running it

[Back to the README](../README.md)

With Docker, without it, and from the command line. Also what happens with a broken file.

**With Docker**, all three:

```
docker compose up --build
```

| Service | What you get |
|---|---|
| frontend | The app at http://localhost:3000: upload a file, see its dashboard |
| backend | The API at http://localhost:8000. Try it at http://localhost:8000/docs |
| database | PostgreSQL at `localhost:5432`, with every upload |

**Follow an upload live:** run `scripts/watch-uploads.sh` while Docker runs. It opens tmux with 3 panes: the request reaching nginx, the backend's stages (received, checked, saved), and the rows saved in the database. Leave with Ctrl-b d.

**Without Docker**, in two terminals. The backend then saves to a local SQLite file, `backend/xer_checker.db`:

```
cd backend
pip install -r requirements.txt      # the API, the database, the chart, and the optional AI
uvicorn main:app --reload            # the API at http://localhost:8000
```

```
cd frontend
npm install
npm run dev                          # the app at http://localhost:5173
```

**The command line**, from `backend/`, needs no server:

```
python checker.py                    # check both files in data/ and save chart.png
python checker.py data/CSTv2.4.xer   # check one file; chart.png stays as it is
```

**Broken rows.** The two real files have none. So `broken_test.xer` is a short excerpt of `CSTv2.4.xer`, damaged on purpose. From `backend/`:

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

**A row that only ends early is read, not dropped:**

- **Why:** some real exports leave off empty values at the end, like MPXJ's `TwentyFourHourCalendar.xer` (P6 8.2).
- **How:** the missing values are read as blanks, and the row is listed as a note.
- **Only when:** nothing the checks need is missing, and every value still fits its column.
- **Tested on:** 10,583 rows in 8 real exports from 5 sources (P6 8.2 to 24.12).

**A file that can't be checked says why.** The checker then moves on to the next file, and exits with code 1:

| File | What the checker says |
|---|---|
| Missing | `can't open the file (no such file or directory)` |
| Empty | `the file is empty` |
| A P6 XML export | `it's an XML file, not an XER export: export the schedule from P6 as XER` |
| Not a P6 export, like a PDF | `it isn't a P6 XER export: line 1 should start with ERMHDR, not '%PDF-1.7'` |
| No activities | `it has no TASK table, so there are no activities to check` |
| A column the checks need is missing | `its TASK table has no status_code column, which the checks need` |

**Two more cases:**

- **Nothing to check** (only finished, milestone, level-of-effort or WBS summary activities): shows n/a, not pass.
- **A UTF-16 file, or one that starts with a byte-order mark** (a hidden marker some editors add): read normally.
