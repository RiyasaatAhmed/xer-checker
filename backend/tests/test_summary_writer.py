"""summarize() (xer_checker/summary/writer.py): use Gemini's reply, retry once, or let code write it.

Gemini's replies are faked, so no key or internet is needed.
"""

from helpers import FACTS, GOOD_REPLY, GOOD_TEXT, fake_gemini, say

from xer_checker.summary import gemini, settings, summarize
from xer_checker.summary.rules import fill
from xer_checker.summary.writer import CODE_SUMMARY


def test_no_key_means_code_writes_the_summary():
    text, author = summarize(FACTS)
    assert author == "code (no GEMINI_API_KEY; see .env.example)"
    assert text == ["Missing links: 20 of 133 activities (15.0%), over DCMA's 5% limit.",
                    "Negative float: 0 of 133 activities (0.0%), within DCMA's 0% limit.",
                    "Float over 44 working days: 78 of 133 activities (58.6%), over DCMA's 5% limit.",
                    "Broken rows in the file: 0."]


def test_key_without_a_model_means_code_writes_the_summary(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    text, author = summarize(FACTS)
    assert author == "code (no GEMINI_MODEL; see .env.example)"
    assert text == fill(CODE_SUMMARY, FACTS)


def test_unknown_thinking_level_means_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch)  # never called: the setting is checked first
    monkeypatch.setenv(settings.THINKING_VAR, "fast")
    text, author = summarize(FACTS)
    assert author == "code (GEMINI_THINKING_LEVEL must be minimal, low, medium, high or empty)"


def test_model_comes_from_the_environment(monkeypatch):
    calls = fake_gemini(monkeypatch, GOOD_REPLY, model="model-from-env")
    text, author = summarize(FACTS)
    assert calls[0][0].model == "model-from-env"
    assert author == "Gemini (model-from-env)"


def test_good_reply_is_used(monkeypatch):
    fake_gemini(monkeypatch, GOOD_REPLY)
    text, author = summarize(FACTS)
    assert text == GOOD_TEXT
    assert author == "Gemini (test-model)"


def test_bad_reply_gets_one_retry_that_says_what_was_wrong(monkeypatch):
    calls = fake_gemini(monkeypatch, [say("About 20 lack a link.")], GOOD_REPLY)
    text, author = summarize(FACTS)
    assert text == GOOD_TEXT and author == "Gemini (test-model)"
    assert calls[0][1] == "" and "sentence 1 has a number in digits" in calls[1][1]


def test_two_bad_replies_mean_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch, [say("About 20 lack a link.")], [say("missing_links: {missing_links}.")])
    text, author = summarize(FACTS)
    assert author.startswith("code (Gemini broke a rule twice")
    assert text == fill(CODE_SUMMARY, FACTS)


def test_failed_call_means_code_writes_the_summary(monkeypatch):
    fake_gemini(monkeypatch)

    def fail(*args):
        raise TimeoutError("The read operation timed out")
    monkeypatch.setattr(gemini, "ask_gemini", fail)
    text, author = summarize(FACTS)
    assert author == "code (Gemini failed: The read operation timed out)"
    assert text == fill(CODE_SUMMARY, FACTS)
