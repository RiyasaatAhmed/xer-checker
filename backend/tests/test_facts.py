"""The facts handed to the summary (xer_checker/facts.py) come straight from the checker's results."""

from helpers import FACTS, ROOT

from xer_checker.checks import check
from xer_checker.facts import summary_facts
from xer_checker.reader import read_xer


def test_facts_for_real_file_match_the_readme():
    tables, broken, _ = read_xer(ROOT / "data" / "CSTv2.4.xer")
    checked, failures, problems = check(tables)
    assert summary_facts(checked, failures, broken + problems) == FACTS


def test_nothing_checked_says_so_instead_of_within_the_limit():
    facts = summary_facts(0, {"Missing links": [], "Negative float": [], "High float": []}, [])
    assert facts["missing_links_vs_limit"] == "nothing to check" and facts["missing_links_pct"] == "0.0%"
