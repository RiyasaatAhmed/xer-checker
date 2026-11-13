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

A checker for Primavera P6 schedule files (`.xer`). You upload a file in the browser and see a dashboard. For each file, it:

1. Flags broken rows, with their line numbers.
2. Runs 3 DCMA checks on unfinished work: missing links, negative float, high float.
3. Draws one chart of the results.
4. Writes a short summary. Gemini picks the words; code computes every number.
5. Saves the upload and its results, so they can be opened again.

## Folders

| Folder | What it holds | Status |
|---|---|---|
| `backend/` | The FastAPI app and the checker: code, tests, `data/` and `results-from-kazinex/` | Works |
| `frontend/` | Vite, React and TypeScript: the upload button and the dashboard. nginx serves it in Docker and passes `/api` to the backend | Works |
| `database/` | PostgreSQL 17. The backend creates the tables at start | Works |

Each folder has a `Dockerfile`. `docker-compose.yml` runs all three. `.env` and `.env.example` stay at the repo root, and Docker Compose reads `.env` too.

## Commands

Run the Python commands from `backend/`: `checker.py` finds `data/` from the current folder. The `.venv` is at the repo root.

| Command | What it does |
|---|---|
| `docker compose up --build` | From the repo root: builds and starts all three services. The app is at http://localhost:3000, the API at http://localhost:8000/docs. |
| `../.venv/bin/uvicorn main:app --reload` | Runs the API on port 8000. Without `DATABASE_URL`, it saves to `backend/xer_checker.db` (gitignored). |
| `npm run dev` | From `frontend/`: the app at http://localhost:5173. It passes `/api` to port 8000. |
| `npm test`, `npm run lint`, `npm run build` | From `frontend/`: tests with a faked backend, oxlint, and the production build. |
| `../.venv/bin/python checker.py` | Checks every `.xer` in `data/`, prints the report and rewrites `chart.png`. Calls Gemini if a key is set. |
| `../.venv/bin/python checker.py FILE.xer` | Checks one file. No chart. |
| `GEMINI_API_KEY= ../.venv/bin/python checker.py` | Runs with the AI off. |
| `../.venv/bin/python -m pytest -q` | Runs all tests. No key or internet needed. Packages: `requirements-dev.txt`. |
| `uv pip install --python ../.venv/bin/python <package>` | Adds a package. The `.venv` has no `pip`. Add it to `requirements.txt` too, for Docker. |

## How the code is organized

`backend/` follows one layout, from the hcc-platform pattern:

| Path | Job |
|---|---|
| `main.py` | Creates the FastAPI app, with a health route at `/`, and adds each module's router |
| `modules/<feature>/` | One API feature: `route.py` (HTTP only), `schema.py` (pydantic answers), `service.py` (the work), `model.py` (its tables) |
| `modules/uploads/` | `POST /api/uploads` checks and saves a file; `GET /api/uploads` lists them; `GET /api/uploads/{id}` opens one. Reuses `cli.check_file` |
| `database/db.py` | `DATABASE_URL` (PostgreSQL in Docker, else SQLite), `get_session` per request, `init_db` creates missing tables |
| `checker.py` | Starts the command line |
| `xer_checker/` | The checker, shared by the API and the command line |

In `xer_checker/`, each file has one job and one test file in `tests/`:

| File | Job |
|---|---|
| `reader.py` | `read_xer`: reads a file, flags broken rows, or raises `FileError` with a plain reason |
| `checks.py` | `check(tables)`: picks the activities DCMA checks, works out links and float in days, runs every rule |
| `activity.py` | `Activity`: what a rule sees about one activity |
| `rules/` | One file per DCMA rule: `NAME`, `LIMIT`, `DCMA_SECTION`, `fails(activity)`. `RULES` and `LIMITS` are in `__init__.py` |
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
- A new DCMA rule is a new file in `xer_checker/rules/`, added to `RULES`, with its own `tests/test_rule_<name>.py`.
- A new API feature is a new folder in `modules/`, with `route.py`, `schema.py`, `service.py` and `model.py`, added in `main.py`.
- The API answers from the database, never straight from the checker: save first, then read back. A saved upload is never changed.
- Tests use the `db_session` and `client` fixtures in `tests/conftest.py`: a fresh in-memory SQLite database each.
- The tables are made with `create_all` at start. Once a table needs a change, add Alembic migrations first.
- Frontend: one component per file in `src/components/`. Status shows an icon and a word, never color alone.
- To test a commit on its own, use a temporary `git worktree`. Never `git stash`: the repo holds an old stash entry.
- Route functions that call the checker are plain `def`, not `async def`: a slow Gemini call then runs in a thread.

## Don't change unless the user asks

| Path | Why |
|---|---|
| `.env` | It holds the Gemini key. Never print its values. |
| `backend/data/` | Unchanged public copies of the two files. |
| `backend/results-from-kazinex/` | Kazinex's reports, the baseline the tests compare with. |
