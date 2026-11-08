"""Check Primavera P6 schedule files (.xer).

For every .xer file in data/: report broken rows, run three DCMA checks
(missing links, negative float, high float), then save one chart as chart.png.

Usage:
  python checker.py              check every .xer in data/ and save chart.png
  python checker.py FILE.xer     check only the files named (no chart, so chart.png stays as is)
"""

import csv  # splits each line into values
import io  # lets csv read from a string in memory
import sys  # reads file names given on the command line
from pathlib import Path  # finds the .xer files

import matplotlib

matplotlib.use("Agg")  # draw straight to a file; no window
import matplotlib.pyplot as plt  # noqa: E402  (must come after matplotlib.use)

# ---------- Constants ----------

# Input and output
DATA_DIR = "data"  # folder with the .xer files to check
XER_PATTERN = "*.xer"  # which files in DATA_DIR to read
CHART_FILE = "chart.png"  # where the chart is saved

# Reading the file
ENCODINGS = ("utf-8", "cp1252")  # try in order; P6 writes Windows-1252 (cp1252) by default
MAX_FIELD_SIZE = 10_000_000  # csv's default cap is 131,072 chars; P6 calendar values can be longer
DELIMITER = "\t"  # XER values are separated by tabs

# XER record markers: the first value on each line says what the line is
EXPORT_HEADER = "ERMHDR"  # line 1: who exported the file, and when
TABLE_START = "%T"  # a new table starts; the next value is its name
COLUMN_NAMES = "%F"  # the current table's column names
DATA_ROW = "%R"  # one row of data in the current table
END_OF_FILE = "%E"  # last line of a complete file

# P6 codes (TASK.status_code and TASK.task_type)
FINISHED = "TK_Complete"  # status of a finished activity
# Activity types DCMA leaves out: level of effort, WBS summary, start milestone, finish milestone
NOT_CHECKED_TYPES = ("TT_LOE", "TT_WBS", "TT_Mile", "TT_FinMile")
DEFAULT_HOURS_PER_DAY = 8  # used when a calendar is missing or has no hours per day

# DCMA rules, from the DCMA 14-Point Assessment: section 4 of DCMA-EA PAM 200.1 (Oct 2012),
# the last published version of the checklist (copy hosted by Mosaic Projects):
#   https://mosaicprojects.com.au/PDF-Gen/DCMA-PAM-200-1.pdf
#   https://www.mosaicprojects.com.au/WhitePapers/WP1088_DCMA-14-Point.pdf
HIGH_FLOAT_DAYS = 44  # float above 44 working days is "high"
LIMITS = {"Missing links": 5, "Negative float": 0, "High float": 5}  # above this %, DCMA flags the schedule

# Terminal report
MAX_BROKEN_SHOWN = 10  # broken rows printed per file
EXAMPLES_SHOWN = 3  # failing activity codes printed per check
MAX_TEXT_SHOWN = 30  # characters of a bad line shown in its message

# Chart
CHART_SIZE = (9, 4.8)  # inches
CHART_DPI = 150  # pixels per inch, so the image is 1350 x 720
BAR_WIDTH = 0.35  # width of one file's group slot; each bar fills 90% of it
FILE_COLORS = ["#2a78d6", "#eb6834"]  # one per file (blue, orange), so the chart supports 2 files
LIMIT_LINE_COLOR = "#52514e"  # dark grey dashed line
LABEL_FONT_SIZE = 9  # size of the numbers on top of the bars


# ---------- 1. Read the file ----------

def read_xer(path):
    """Parse an .xer file.

    Returns (tables, broken):
      tables  {table name: [row dict, ...]}, each row maps column -> value, plus "_line"
      broken  [(line number, problem), ...] for rows that break the format
    """
    # Turn the file's bytes into text: UTF-8 if valid, otherwise Windows-1252.
    raw = path.read_bytes()
    try:
        text = raw.decode(ENCODINGS[0])
    except UnicodeDecodeError:
        text = raw.decode(ENCODINGS[1], errors="replace")

    tables, broken = {}, []  # the results we return
    table, columns, ended = None, None, False  # memory: current table, its columns, saw %E yet?
    csv.field_size_limit(MAX_FIELD_SIZE)  # allow very long values (P6 calendars)
    # Tab-separated. csv also rejoins quoted values that span several lines.
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=DELIMITER)
    last_line = 0  # last line number csv has read so far
    for values in reader:  # one record (usually one line) at a time
        line, last_line = last_line + 1, reader.line_num  # this record starts on `line`
        if not values:
            continue  # skip blank lines
        kind = values[0]  # the first value says what the line is
        if kind == TABLE_START:
            table, columns = values[1], None  # remember the new table's name
            tables[table] = []  # and give it an empty list of rows
        elif kind == COLUMN_NAMES:
            columns = values[1:]  # remember this table's column names
        elif kind == DATA_ROW:
            if columns is None:  # a row with no column names before it
                broken.append((line, f"{table} row comes before its column names"))
            elif len(values) - 1 != len(columns):  # wrong number of values (-1 skips "%R")
                broken.append((line, f"{table} row has {len(values) - 1} values, expected {len(columns)}"))
            else:  # a good row: pair each column name with its value
                row = dict(zip(columns, values[1:]))
                row["_line"] = line  # keep the line number for later error messages
                tables[table].append(row)
        elif kind == END_OF_FILE:
            ended = True  # the file is complete
        elif kind != EXPORT_HEADER:  # anything else isn't valid XER
            broken.append((line, f"line doesn't start with %T, %F, %R or %E: {kind[:MAX_TEXT_SHOWN]!r}"))
    if not ended:  # no %E means the file was probably cut off
        broken.append((last_line, "no %E end marker, so the file may be cut off"))
    return tables, broken


def number(text):
    """float(text), or None if text isn't a number."""
    try:
        return float(text)  # "12.5" -> 12.5
    except ValueError:
        return None  # "TBD" -> None, instead of crashing


# ---------- 2. Run the three checks ----------

def check(tables, broken):
    """Run the three checks on unfinished work activities.

    Appends data problems (bad links, non-numeric float) to `broken`.
    Returns (activities checked, {check name: [failing activity codes]}).
    """
    # Lookups: calendar ID -> hours in its working day, and activity ID -> activity row.
    hours_per_day = {c["clndr_id"]: number(c.get("day_hr_cnt", "")) or DEFAULT_HOURS_PER_DAY for c in tables.get("CALENDAR", [])}
    tasks = {t["task_id"]: t for t in tables.get("TASK", [])}

    # Links (TASKPRED): record which activities have a predecessor and which have a successor.
    has_pred, has_succ = set(), set()
    for link in tables.get("TASKPRED", []):
        succ, pred = link["task_id"], link["pred_task_id"]  # pred comes first, then succ
        if succ not in tasks or pred not in tasks:  # the other end wasn't read: missing, or its row is broken
            broken.append((link["_line"], "TASKPRED link points to an activity that's missing or on a broken row"))
            continue
        has_pred.add(succ)  # the later activity now has something before it
        has_succ.add(pred)  # the earlier activity now has something after it

    # As DCMA says: check unfinished work only. Skip finished activities, level of effort,
    # WBS summaries and milestones.
    open_tasks = [t for t in tasks.values()
                  if t["status_code"] != FINISHED and t["task_type"] not in NOT_CHECKED_TYPES]

    failures = {name: [] for name in LIMITS}  # one empty list per check
    for t in open_tasks:
        # Check 1, missing links: nothing before it or nothing after it.
        if t["task_id"] not in has_pred or t["task_id"] not in has_succ:
            failures["Missing links"].append(t["task_code"])

        # Read the float. A blank is normal; text like "TBD" is a broken row.
        hours = number(t["total_float_hr_cnt"]) if t["total_float_hr_cnt"] else None
        if t["total_float_hr_cnt"] and hours is None:
            broken.append((t["_line"], f"TASK total float {t['total_float_hr_cnt']!r} is not a number"))
        if hours is None:
            continue  # blank float: nothing to check
        # Float is stored in hours; convert with the activity's own calendar.
        days = hours / hours_per_day.get(t["clndr_id"], DEFAULT_HOURS_PER_DAY)
        if days < 0:  # check 2: already behind the deadline
            failures["Negative float"].append(t["task_code"])
        if days > HIGH_FLOAT_DAYS:  # check 3: so much spare time can mean a missing link
            failures["High float"].append(t["task_code"])
    return len(open_tasks), failures


# ---------- 3. Print the results and draw the chart ----------

def report(name, checked, failures, broken):
    """Print the first broken rows, then count, %, pass/fail and example codes per check."""
    print(f"\n{name}: {checked} activities checked")
    print(f"  Broken rows: {len(broken)}")
    for line, problem in sorted(broken)[:MAX_BROKEN_SHOWN]:  # show the first few, in line order
        print(f"    line {line}: {problem}")
    for check_name, codes in failures.items():
        pct = 100 * len(codes) / checked if checked else 0  # share that failed (0 if nothing checked)
        verdict = "pass" if pct <= LIMITS[check_name] else "FLAG"  # over the DCMA limit: worth a closer look
        examples = ", ".join(codes[:EXAMPLES_SHOWN])  # a few failing activity codes
        print(f"  {check_name:<15} {len(codes):>4}  {pct:5.1f}%  {verdict} (limit {LIMITS[check_name]}%)  {examples}")


def draw_chart(results):
    """Save chart.png: % failing per check, one bar per file, dashed line at each DCMA limit."""
    names = list(LIMITS)  # the three checks, in a fixed order
    fig, ax = plt.subplots(figsize=CHART_SIZE, dpi=CHART_DPI)  # an empty chart
    width = BAR_WIDTH
    for i, (file_name, checked, failures) in enumerate(results):  # one colour per file
        # Spread each file's bar side by side around its check (file 1 left, file 2 right).
        xs = [x + (i - (len(results) - 1) / 2) * width for x in range(len(names))]
        pcts = [100 * len(failures[n]) / checked for n in names]  # bar heights in %
        bars = ax.bar(xs, pcts, width * 0.9, label=file_name, color=FILE_COLORS[i % len(FILE_COLORS)])
        # Write "count (percent)" on top of each bar, with one decimal like the printed report.
        ax.bar_label(bars, labels=[f"{len(failures[n])} ({p:.1f}%)" for n, p in zip(names, pcts)], fontsize=LABEL_FONT_SIZE)
    for x, name in enumerate(names):  # a dashed line at each check's limit
        ax.hlines(LIMITS[name], x - 0.4, x + 0.4, colors=LIMIT_LINE_COLOR, linestyles="dashed",
                  label="DCMA limit" if x == 0 else None)  # label once so the legend shows it once
    # Labels, title and tidy-up.
    ax.set_xticks(range(len(names)), [f"{n}\nlimit {LIMITS[n]}%" for n in names])
    ax.set_ylabel("% of unfinished work activities")
    ax.set_title("Unfinished work activities flagged by each check", loc="left")
    ax.spines[["top", "right"]].set_visible(False)  # remove the top and right borders
    ax.legend(frameon=False)
    fig.tight_layout()  # stop labels from being cut off
    fig.savefig(CHART_FILE)


def main():
    """Check the .xer files named on the command line, or every .xer in DATA_DIR.

    The chart is saved only for the DATA_DIR run, so checking a test file never replaces it.
    """
    named = [Path(arg) for arg in sys.argv[1:]]  # files typed after "python checker.py", if any
    paths = named or sorted(Path(DATA_DIR).glob(XER_PATTERN))  # otherwise every .xer, alphabetically
    results = []  # (file name, activities checked, failures) for each file
    for path in paths:
        tables, broken = read_xer(path)  # 1. read
        checked, failures = check(tables, broken)  # 2. check
        report(path.name, checked, failures, broken)  # 3. print
        results.append((path.name, checked, failures))  # keep it for the chart
    if not named:
        draw_chart(results)  # one chart for all files in DATA_DIR
        print(f"\nSaved {CHART_FILE}")


if __name__ == "__main__":  # only when run directly, not when imported
    main()
