"""The facts handed to the summary (xer_checker/facts.py) come straight from the checker's results."""

from helpers import FACTS, ROOT

from xer_checker.checks import check
from xer_checker.facts import summary_facts
from xer_checker.reader import read_xer


THREE = ("Missing links", "Negative float", "High float")  # the checks whose numbers the README gives


def test_facts_for_real_file_match_the_readme():
    tables, broken, _ = read_xer(ROOT / "data" / "CSTv2.4.xer")
    checked, failures, problems = check(tables)
    only_three = {name: failures[name] for name in THREE}
    facts = summary_facts(checked, only_three, broken + problems)
    assert {k: v for k, v in facts.items() if not k.endswith("_name")} == FACTS


def test_the_summary_covers_the_worst_three_checks_only():
    failures = {name: [] for name in ("Missing links", "Leads", "Lags", "High float", "Resources")}
    failures["Lags"] = ["A1"] * 10  # 10 of 10: over its 5% limit, but a minor check
    failures["High float"] = ["A1"] * 10  # over its limit, and more serious than lags
    failures["Missing links"] = ["A1"] * 10  # the most serious
    facts = summary_facts(10, failures, [])
    covered = [k.removesuffix("_vs_limit") for k in facts if k.endswith("_vs_limit")]
    assert covered == ["missing_links", "high_float", "lags"]


def test_a_check_that_cant_run_is_left_out_of_the_summary():
    facts = summary_facts(10, {"Missing links": ["A1"], "BEI": []}, [], skipped={"BEI": "Needs a baseline schedule."})
    assert "bei" not in facts and "missing_links" in facts


def test_a_check_of_ours_doesnt_borrow_dcmas_name():
    facts = summary_facts(10, {"Duplicate links": ["A1"]}, [])
    assert facts["duplicate_links_vs_limit"] == "over the checker's 0% limit"


def test_nothing_checked_says_so_instead_of_within_the_limit():
    facts = summary_facts(0, {"Missing links": [], "Negative float": [], "High float": []}, [])
    assert facts["missing_links_vs_limit"] == "nothing to check" and facts["missing_links_pct"] == "0.0%"
