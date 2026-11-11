"""Shared by the tests: sample facts, sample replies, small .xer files, and a fake Gemini."""

from pathlib import Path

from xer_checker.summary import gemini, settings

ROOT = Path(__file__).parent.parent  # the project folder, where data/ and broken_test.xer are

# ---------- Summaries ----------

# The facts the checker hands over for CSTv2.4.xer (the numbers in the README).
FACTS = {
    "checked": "133", "broken_rows": "0", "high_float_days": "44",
    "missing_links": "20", "missing_links_pct": "15.0%", "missing_links_vs_limit": "over DCMA's 5% limit",
    "negative_float": "0", "negative_float_pct": "0.0%", "negative_float_vs_limit": "within DCMA's 0% limit",
    "high_float": "78", "high_float_pct": "58.6%", "high_float_vs_limit": "over DCMA's 5% limit",
}


def say(text, about="missing_links"):
    """One sentence of a reply, the way Gemini sends it."""
    return {"about": about, "text": text}


# A good reply for FACTS: a sentence for each check over its limit (high float, then missing links).
GOOD_REPLY = [
    say("{high_float} of the {checked} activities ({high_float_pct}) have high float, {high_float_vs_limit}.", "high_float"),
    say("{missing_links} activities ({missing_links_pct}) lack a link, {missing_links_vs_limit}."),
]
GOOD_TEXT = ["78 of the 133 activities (58.6%) have high float, over DCMA's 5% limit.",
             "20 activities (15.0%) lack a link, over DCMA's 5% limit."]


def fake_gemini(monkeypatch, *replies, model="test-model"):
    """Turn the AI on with a fake key, make Gemini return these replies in order, and record each call."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv(settings.MODEL_VAR, model)
    calls, answers = [], iter(replies)

    def ask(used_settings, facts, feedback):
        calls.append((used_settings, feedback))
        return next(answers)
    monkeypatch.setattr(gemini, "ask_gemini", ask)
    return calls


# ---------- Small .xer files ----------

# The smallest file the checks can run on: one unfinished activity.
GOOD = ("ERMHDR\t23.12\n%T\tTASK\n"
        "%F\ttask_id\ttask_code\tstatus_code\ttask_type\ttotal_float_hr_cnt\tclndr_id\n"
        "%R\t1\tA1000\tTK_NotStart\tTT_Task\t0\t1\n%E\n")

# Like MPXJ's real TwentyFourHourCalendar.xer: its TASK row stops before the optional location_id.
ENDS_EARLY = ("ERMHDR\t8.2.0\n%T\tTASK\n"
              "%F\ttask_id\ttask_code\tstatus_code\ttask_type\ttotal_float_hr_cnt\tclndr_id\tupdate_date\tlocation_id\n"
              "%R\t1\tA1000\tTK_NotStart\tTT_Task\t0\t1\t2020-03-17 13:25\n%E\n")


def save(tmp_path, text, encoding="utf-8"):
    """Write `text` to a .xer file in a temporary folder, and return its path."""
    path = tmp_path / "test.xer"
    path.write_bytes(text.encode(encoding))
    return path
