"""Print one file's results in the terminal."""

import textwrap  # wraps the summary points to fit the terminal

from .checks import LIMITS, percent, within_limit

# ---------- Constants ----------

MAX_BROKEN_SHOWN = 10  # broken rows printed per file
EXAMPLES_SHOWN = 3  # failing activity codes printed per check
SUMMARY_WRAP = 100  # characters per line of the summary, like the report above it


def report(result):
    """Print the first broken rows and notes, then count, %, pass/fail and example codes per check, then the summary."""
    print(f"\n{result.name}: {result.checked} activities checked")
    if not result.checked:  # say so, instead of a misleading "pass"
        print("  Nothing to check: every activity is finished, a milestone, level of effort or a WBS summary")
    print(f"  Broken rows: {len(result.broken)}")
    for line, problem in sorted(result.broken)[:MAX_BROKEN_SHOWN]:  # show the first few, in line order
        print(f"    line {line}: {problem}")
    if result.notes:  # rows that ended early and were read with blanks
        print(f"  Rows read with blanks at the end: {len(result.notes)}")
        for line, note in result.notes[:MAX_BROKEN_SHOWN]:
            print(f"    line {line}: {note}")
    for check_name, codes in result.failures.items():
        pct = percent(len(codes), result.checked)  # share that failed (0 if nothing checked)
        examples = ", ".join(codes[:EXAMPLES_SHOWN])  # a few failing activity codes
        print(f"  {check_name:<15} {len(codes):>4}  {pct:5.1f}%  {verdict(check_name, pct, result.checked)} "
              f"(limit {LIMITS[check_name]}%)  {examples}")
    print(f"  Summary, written by {result.author}:")
    for point in result.points:  # one finding per bullet
        print(textwrap.fill(point, SUMMARY_WRAP, initial_indent="    • ", subsequent_indent="      "))


def verdict(check_name, pct, checked):
    """ "n/a" when nothing was checked, "pass" within the DCMA limit, otherwise "FLAG": worth a closer look."""
    if not checked:
        return "n/a"
    return "pass" if within_limit(check_name, pct) else "FLAG"
