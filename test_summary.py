"""Tests for summary.py. No API key or internet needed: Gemini's replies are faked.

Run: pytest
"""

from pathlib import Path

from dotenv import dotenv_values

import summary
from checker import check, summary_facts
from reader import read_xer
from summary import CODE_SUMMARY, fill, problems, read_settings, summarize

HERE = Path(__file__).parent

# The facts checker.py hands over for CSTv2.4.xer (the numbers in the README).
FACTS = {
    "checked": "133", "broken_rows": "0", "high_float_days": "44",
    "missing_links": "20", "missing_links_pct": "15.0%", "missing_links_vs_limit": "over DCMA's 5% limit",
    "negative_float": "0", "negative_float_pct": "0.0%", "negative_float_vs_limit": "within DCMA's 0% limit",
    "high_float": "78", "high_float_pct": "58.6%", "high_float_vs_limit": "over DCMA's 5% limit",
}


def fake_gemini(monkeypatch, *replies, model="test-model"):
    """Turn the AI on with a fake key, make Gemini return these replies in order, and record each call."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv(summary.MODEL_VAR, model)
    calls, answers = [], iter(replies)

    def ask(settings, facts, feedback):
        calls.append((settings, feedback))
        return next(answers)
    monkeypatch.setattr(summary, "ask_gemini", ask)
    return calls


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


# ---------- Settings ----------

def test_no_key_means_code_writes_the_summary():
    text, author = summarize(FACTS)
    assert author == "code (no GEMINI_API_KEY; see .env.example)"
    assert text.startswith("Checked 133 unfinished work activities")


def test_key_without_a_model_means_code_writes_the_summary(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    text, author = summarize(FACTS)
    assert author == "code (no GEMINI_MODEL; see .env.example)"
    assert text == fill(CODE_SUMMARY, FACTS)


def test_model_comes_from_the_environment(monkeypatch):
    calls = fake_gemini(monkeypatch, ["{high_float} have high float."], model="model-from-env")
    text, author = summarize(FACTS)
    assert calls[0][0].model == "model-from-env"
    assert author == "Gemini (model-from-env)"


def test_settings_are_trimmed_and_thinking_level_is_read(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "  test-key \n")
    monkeypatch.setenv(summary.MODEL_VAR, " gemini-test ")
    monkeypatch.setenv(summary.THINKING_VAR, "MINIMAL")
    assert read_settings() == summary.Settings("test-key", "gemini-test", "minimal")


def test_empty_thinking_level_means_the_models_own_default(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv(summary.MODEL_VAR, "gemini-test")
    monkeypatch.setenv(summary.THINKING_VAR, "")
    assert read_settings().thinking_level is None


def test_unknown_thinking_level_means_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch)  # never called: the setting is checked first
    monkeypatch.setenv(summary.THINKING_VAR, "fast")
    text, author = summarize(FACTS)
    assert author == "code (GEMINI_THINKING_LEVEL must be minimal, low, medium, high or empty)"


def test_env_example_documents_every_setting_and_holds_no_key():
    example = dotenv_values(HERE / ".env.example")
    assert {"GEMINI_API_KEY", summary.MODEL_VAR, summary.THINKING_VAR} <= example.keys()
    assert example[summary.MODEL_VAR]  # a working model, so copying the file is enough
    assert example[summary.THINKING_VAR] in summary.THINKING_LEVELS
    key = example["GEMINI_API_KEY"] or ""
    assert not key or key.startswith("<"), "a real key must never be in the public example file"


# ---------- What summarize() does with Gemini's reply ----------

def test_good_reply_is_used(monkeypatch):
    fake_gemini(monkeypatch, ["{high_float} activities ({high_float_pct}) have high float, {high_float_vs_limit}."])
    text, author = summarize(FACTS)
    assert text == "78 activities (58.6%) have high float, over DCMA's 5% limit."
    assert author == "Gemini (test-model)"


def test_bad_reply_gets_one_retry_that_says_what_was_wrong(monkeypatch):
    calls = fake_gemini(monkeypatch, ["About 20 lack a link."], ["{missing_links} lack a link."])
    text, author = summarize(FACTS)
    assert text == "20 lack a link." and author == "Gemini (test-model)"
    assert calls[0][1] == "" and "sentence 1 has a number in digits" in calls[1][1]


def test_two_bad_replies_mean_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch, ["About 20 lack a link."], ["Twenty lack a link."])
    text, author = summarize(FACTS)
    assert author.startswith("code (Gemini broke a rule twice")
    assert text == fill(CODE_SUMMARY, FACTS)


def test_failed_call_means_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch)

    def fail(*args):
        raise TimeoutError("The read operation timed out")
    monkeypatch.setattr(summary, "ask_gemini", fail)
    text, author = summarize(FACTS)
    assert author == "code (Gemini failed: The read operation timed out)"
    assert text == fill(CODE_SUMMARY, FACTS)


def test_server_timeout_is_explained_in_plain_words():
    class Deadline(Exception):  # what Google's server returns when it hits our time limit
        status = "DEADLINE_EXCEEDED"
    assert summary.reason(Deadline("Deadline expired before operation could complete.")) == "no answer within 30 seconds"


# ---------- The facts come from the checker ----------

def test_facts_for_real_file_match_the_readme():
    tables, broken, _ = read_xer(HERE / "data" / "CSTv2.4.xer")
    checked, failures = check(tables, broken)
    assert summary_facts(checked, failures, broken) == FACTS


def test_code_summary_follows_the_same_rules_as_gemini():
    assert problems(CODE_SUMMARY, FACTS) == []
