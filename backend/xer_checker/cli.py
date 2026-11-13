"""Run the checker from the command line.

For each file: read it, run the checks, summarize the results and print the report. Then draw
one chart. A file that can't be checked gets a plain reason instead of a crash.

Usage:
  python checker.py              check every .xer in data/ and save chart.png
  python checker.py FILE.xer     check only the files named (no chart, so chart.png stays as is)
"""

import sys  # reads file names given on the command line
from pathlib import Path  # finds the .xer files

from .chart import draw_chart
from .checks import check
from .facts import summary_facts
from .reader import FileError, read_xer
from .report import report
from .result import FileResult
from .summary import summarize

# ---------- Constants ----------

DATA_DIR = "data"  # folder with the .xer files to check
XER_PATTERN = "*.xer"  # which files in DATA_DIR to read
CHART_FILE = "chart.png"  # where the chart is saved


def check_file(path):
    """Read one .xer file, run the checks and summarize them. Raises FileError if it can't be checked."""
    tables, broken, notes = read_xer(path)  # 1. read
    checked, failures, problems = check(tables)  # 2. check
    broken = broken + problems  # rows the reader couldn't use, then data the checks couldn't use
    points, author = summarize(summary_facts(checked, failures, broken))  # 3. summarize: code's numbers, AI's words
    return FileResult(path.name, checked, failures, broken, notes, points, author)


def main(args=None):
    """Check the .xer files named in `args` (default: on the command line), or every .xer in DATA_DIR.

    The chart is saved only for the DATA_DIR run, so checking a test file never replaces it.
    Returns the exit code: 1 if any file couldn't be checked, otherwise 0.
    """
    named = [Path(arg) for arg in (sys.argv[1:] if args is None else args)]  # files typed after "python checker.py"
    paths = named or sorted(Path(DATA_DIR).glob(XER_PATTERN))  # otherwise every .xer, alphabetically
    results = []  # one FileResult per file that could be checked
    failed = 0  # files that couldn't be checked
    for path in paths:
        try:
            result = check_file(path)
        except FileError as problem:  # it can't be checked: say why in plain words, then go on
            print(f"\n{path.name}: can't be checked: {problem}")
            failed += 1
            continue
        report(result)  # 4. print
        results.append(result)  # keep it for the chart
    if not named and results:
        draw_chart(results, CHART_FILE)  # one chart for all files in DATA_DIR
        print(f"\nSaved {CHART_FILE}")
    return 1 if failed else 0  # 1 tells a script that a file couldn't be checked
