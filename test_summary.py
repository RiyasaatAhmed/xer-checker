"""Tests for summary.py.

Run: pytest
"""

from pathlib import Path

from checker import check, summary_facts
from reader import read_xer
from summary import CODE_SUMMARY, fill, summarize

HERE = Path(__file__).parent

# The facts checker.py hands over for CSTv2.4.xer (the numbers in the README).
FACTS = {
    "checked": "133", "broken_rows": "0", "high_float_days": "44",
    "missing_links": "20", "missing_links_pct": "15.0%", "missing_links_vs_limit": "over DCMA's 5% limit",
    "negative_float": "0", "negative_float_pct": "0.0%", "negative_float_vs_limit": "within DCMA's 0% limit",
    "high_float": "78", "high_float_pct": "58.6%", "high_float_vs_limit": "over DCMA's 5% limit",
}


# ---------- The summary ----------

def test_summary_is_written_by_code_from_the_facts():
    text, author = summarize(FACTS)
    assert author == "code"
    assert text == fill(CODE_SUMMARY, FACTS)
    assert text.startswith("Checked 133 unfinished work activities")


# ---------- The facts come from the checker ----------

def test_facts_for_real_file_match_the_readme():
    tables, broken, _ = read_xer(HERE / "data" / "CSTv2.4.xer")
    checked, failures = check(tables, broken)
    assert summary_facts(checked, failures, broken) == FACTS
