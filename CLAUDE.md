# CLAUDE.md

Guidance for Claude Code in this repo.

## Hard rule: run /plain-writing before you write any text

Before you write or change any text in this repo, run the `plain-writing` skill ([`.claude/skills/plain-writing/SKILL.md`](.claude/skills/plain-writing/SKILL.md)). Follow it to the end, including its clarity check.

**Text means:**

- the README and every `.md` file
- docstrings, code comments and constant comments
- error messages and anything the checker prints
- test names
- commit messages and PR descriptions
- the AI prompt, `backend/xer_checker/summary/prompt.md`

No exceptions, even for one line. The skill says how much checking a one-line text needs.

## What this repo is

A checker for Primavera P6 schedule files (`.xer`). For each file, it:

1. Flags broken rows, with their line numbers.
2. Runs 3 DCMA checks on unfinished work: missing links, negative float, high float.
3. Draws one chart of the results.
4. Writes a short summary. Gemini picks the words; code computes every number.

## Folders

| Folder | What it holds | Status |
|---|---|---|
| `backend/` | The checker: code, tests, `data/` and `results-from-kazinex/` | Works. The API comes next |
| `frontend/` | The upload page | A placeholder page served by nginx |
| `database/` | PostgreSQL | Empty, no tables |

Each folder has a `Dockerfile`. `docker-compose.yml` runs all three. `.env` and `.env.example` stay at the repo root, and Docker Compose reads `.env` too.

## Commands

Run the Python commands from `backend/`: `checker.py` finds `data/` from the current folder. The `.venv` is at the repo root.

| Command | What it does |
|---|---|
| `docker compose up --build` | From the repo root: builds and starts all three services. |
| `../.venv/bin/python checker.py` | Checks every `.xer` in `data/`, prints the report and rewrites `chart.png`. Calls Gemini if a key is set. |
| `../.venv/bin/python checker.py FILE.xer` | Checks one file. No chart. |
| `GEMINI_API_KEY= ../.venv/bin/python checker.py` | Runs with the AI off. |
| `../.venv/bin/python -m pytest -q` | Runs all tests. No key or internet needed. |
| `uv pip install --python ../.venv/bin/python <package>` | Adds a package. The `.venv` has no `pip`. Add it to `requirements.txt` too, for Docker. |

## How the code is organized

In `backend/`, `checker.py` only starts the program. Each file in `xer_checker/` has one job and one test file in `tests/`.

| File | Job |
|---|---|
| `reader.py` | `read_xer`: reads a file, flags broken rows, or raises `FileError` with a plain reason |
| `checks.py` | `check(tables)`: the 3 DCMA checks, with `LIMITS` and `percent` |
| `facts.py` | `summary_facts`: the named numbers a summary may use |
| `result.py` | `FileResult`: one file's results |
| `report.py`, `chart.py` | Print one file's results; draw the chart |
| `cli.py` | `main`, `check_file`: run the steps, set the exit code |
| `summary/` | Settings, Gemini call, the rules a reply must pass, and the code-written fallback |

**The AI rule:** Gemini sees the named facts but may not type a number. It writes `{fact}` placeholders instead. Code checks the reply, retries once, falls back to its own summary, then fills in the values.

**Settings:** only from `.env` (see `.env.example`). A missing or wrong setting never crashes the checker.

## Numbers that must not move

`backend/tests/test_baseline.py` locks these and compares them with Kazinex's reports in `backend/results-from-kazinex/`. A change that moves one needs a reason the user agrees with.

| File | Checked | Missing links | Negative float | High float |
|---|---|---|---|---|
| `CSTv2.4.xer` | 133 | 20 (15.0%) | 0 | 78 (58.6%) |
| `example_xer_file.xer` | 365 | 6 (1.6%) | 0 | 170 (46.6%) |

## Code rules

- A file is 300 lines at most.
- One job per module, one test file per module. Steps pass plain data, so each can be tested alone.
- Every fixed value is a named constant in the Constants block, with a comment.
- Reuse an existing function before you write a new one. One job per function.

## Don't change unless the user asks

| Path | Why |
|---|---|
| `.env` | It holds the Gemini key. Never print its values. |
| `backend/data/` | Unchanged public copies of the two files. |
| `backend/results-from-kazinex/` | Kazinex's reports, the baseline the tests compare with. |
