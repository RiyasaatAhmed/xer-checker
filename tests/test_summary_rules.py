"""The rules a summary must pass (xer_checker/summary/rules.py). No Gemini call is made."""

from helpers import FACTS, GOOD_REPLY, GOOD_TEXT, say

from xer_checker.summary.rules import fill, problems
from xer_checker.summary.writer import CODE_SUMMARY


def test_reply_that_points_at_facts_passes_and_gets_filled():
    assert problems(GOOD_REPLY, FACTS) == []
    assert fill(GOOD_REPLY, FACTS) == GOOD_TEXT


def test_number_typed_in_digits_is_rejected():
    assert "digits" in problems([say("{checked} checked, and 21 lack a link.")], FACTS)[0]


def test_number_spelled_out_is_rejected():
    assert "'Twenty'" in problems([say("Twenty of {checked} activities lack a link.")], FACTS)[0]


def test_vague_amount_is_rejected():  # 46.6% is not "most"
    assert "'Most'" in problems([say("Most activities have high float ({high_float_pct}).", "high_float")], FACTS)[0]


def test_fact_that_does_not_exist_is_rejected():
    assert "doesn't exist: critical_path_days" in problems([say("It takes {critical_path_days} days.")], FACTS)[0]


def test_sentence_without_a_fact_is_rejected():  # an unsupported claim, like "the schedule is healthy"
    assert problems([say("The schedule looks healthy.")], FACTS)[0] == "sentence 1 doesn't use any fact"


def test_percent_sign_is_rejected():  # "{missing_links}%" would turn a count of 20 into a made-up 20%
    assert "% sign" in problems([say("{missing_links}% lack a link.")], FACTS)[0]


def test_broken_brace_is_rejected():
    assert "brace" in problems([say("{missing links} lack a link, {missing_links_vs_limit}.")], FACTS)[0]


def test_fact_name_without_braces_is_rejected():  # it would show up in the summary as "missing_links"
    assert problems([say("missing_links reached {missing_links_pct}.")], FACTS)[0] == (
        "sentence 1 writes missing_links without braces; write {missing_links}")


def test_fact_from_another_check_is_rejected():  # the right number in the wrong sentence
    assert problems([say("{high_float} activities lack a link.")], FACTS)[0] == (
        "sentence 1 is about missing_links but uses {high_float}; give that its own sentence")


def test_two_sentences_in_one_point_are_rejected():  # one point, one idea
    assert "more than one sentence" in problems([say("{missing_links} lack a link. Fix them first.")], FACTS)[0]
    assert "more than one sentence" in problems([say("{missing_links} lack a link; fix them first.")], FACTS)[0]


def test_long_point_is_rejected():
    words = " ".join(["word"] * 26)
    assert "more than 25 words" in problems([say("{missing_links} " + words + ".")], FACTS)[0]


def test_saying_limit_itself_is_rejected():  # over or within comes only from the _vs_limit fact
    assert "'limit'" in problems([say("{missing_links} activities exceed the limit, {missing_links_vs_limit}.")], FACTS)[0]


def test_overview_cant_relate_broken_rows_to_activities():  # rows in the file are not activities
    assert "uses {checked}" in problems([say("{broken_rows} of {checked} activities are broken.", "overview")], FACTS)[0]


def test_filler_that_sounds_machine_written_is_rejected():
    assert "'Additionally'" in problems([say("Additionally, {missing_links} activities lack a link.")], FACTS)[0]


def test_unknown_topic_is_rejected():
    assert problems([say("{checked} activities.", "critical_path")], FACTS)[0].startswith(
        "sentence 1 is about 'critical_path'; use one of: overview, missing_links")


def test_check_over_its_limit_cant_be_left_out():
    assert problems(GOOD_REPLY[1:], FACTS) == ["no sentence is about high_float, which is over its limit"]


def test_only_an_overview_sentence_may_use_broken_rows():
    assert problems([*GOOD_REPLY, say("Broken rows: {broken_rows}.", "overview")], FACTS) == []
    assert "uses {broken_rows}" in problems([say("{broken_rows} rows are broken.", "high_float")], FACTS)[0]


def test_reply_that_is_not_a_list_of_sentences_is_rejected():
    assert problems("just a string", FACTS) == ["the reply must have 1 to 4 sentences"]
    assert problems([], FACTS) == ["the reply must have 1 to 4 sentences"]
    assert problems(["a plain string"], FACTS)[0] == 'sentence 1 needs an "about" and some "text"'


def test_code_summary_follows_the_same_rules_as_gemini():
    assert problems(CODE_SUMMARY, FACTS) == []
