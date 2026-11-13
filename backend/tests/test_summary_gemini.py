"""The call to Gemini (xer_checker/summary/gemini.py): the reply's shape, retries and error reasons.

No call is made: these tests only look at what would be sent.
"""

from helpers import FACTS

from xer_checker.summary import gemini


def test_prompt_is_loaded_from_its_own_file():
    assert gemini.PROMPT.startswith("You write the findings of a construction schedule check")


def test_reply_shape_sent_to_gemini_lists_the_allowed_topics():
    about = gemini.reply_schema(FACTS)["properties"]["sentences"]["items"]["properties"]["about"]
    assert about["enum"] == ["overview", "missing_links", "negative_float", "high_float"]


def test_busy_errors_are_retried_but_timeouts_are_not():
    retry = gemini.http_options().retry_options
    assert retry.attempts == 3 and 503 in retry.http_status_codes and 504 not in retry.http_status_codes


def test_server_timeout_is_explained_in_plain_words():
    class Deadline(Exception):  # what Google's server returns when it hits our time limit
        status = "DEADLINE_EXCEEDED"
    assert gemini.reason(Deadline("Deadline expired before operation could complete.")) == "no answer within 30 seconds"
