"""Tests for summary.py.

Run: pytest
"""

from pathlib import Path

from checker import check, summary_facts
from reader import read_xer
from summary import CODE_SUMMARY, fill, problems, summarize

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


# ---------- The rules ----------

def test_sentence_that_points_at_facts_passes_and_gets_filled():
    sentences = ["{missing_links} of {checked} activities ({missing_links_pct}) lack a link, {missing_links_vs_limit}."]
    assert problems(sentences, FACTS) == []
    assert fill(sentences, FACTS) == "20 of 133 activities (15.0%) lack a link, over DCMA's 5% limit."


def test_number_typed_in_digits_is_rejected():
    assert "digits" in problems(["{checked} checked, and 21 lack a link."], FACTS)[0]


def test_number_spelled_out_is_rejected():
    assert "'Twenty'" in problems(["Twenty of {checked} activities lack a link."], FACTS)[0]


def test_vague_amount_is_rejected():  # 46.6% is not "most"
    assert "'Most'" in problems(["Most activities have high float ({high_float_pct})."], FACTS)[0]


def test_fact_that_does_not_exist_is_rejected():
    assert "doesn't exist: critical_path_days" in problems(["The critical path is {critical_path_days} days."], FACTS)[0]


def test_sentence_without_a_fact_is_rejected():  # an unsupported claim, like "the schedule is healthy"
    assert problems(["The schedule looks healthy."], FACTS) == ["sentence 1 doesn't use any fact"]


def test_percent_sign_is_rejected():  # "{missing_links}%" would turn a count of 20 into a made-up 20%
    assert "% sign" in problems(["{missing_links}% lack a link."], FACTS)[0]


def test_broken_brace_is_rejected():
    assert "brace" in problems(["{missing links} lack a link, {missing_links_vs_limit}."], FACTS)[0]


def test_reply_that_is_not_a_list_of_sentences_is_rejected():
    assert problems("just a string", FACTS) == ["the reply must be a list of 1 to 4 sentences"]
    assert problems([], FACTS) == ["the reply must be a list of 1 to 4 sentences"]


# ---------- The facts come from the checker ----------

def test_facts_for_real_file_match_the_readme():
    tables, broken, _ = read_xer(HERE / "data" / "CSTv2.4.xer")
    checked, failures = check(tables, broken)
    assert summary_facts(checked, failures, broken) == FACTS


def test_code_summary_follows_the_rules():
    assert problems(CODE_SUMMARY, FACTS) == []
