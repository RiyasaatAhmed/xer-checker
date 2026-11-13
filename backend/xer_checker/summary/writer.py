"""Write one file's summary: ask Gemini, check its reply, retry once, or let code write it."""

import json  # shows Gemini its last answer on the retry

from . import gemini
from .rules import OVERVIEW, fill, problems
from .settings import SettingsError, read_settings

# ---------- Constants ----------

MAX_TRIES = 2  # the first try, plus one retry that says what was wrong
MAX_REASON_SHOWN = 60  # characters of an error shown when code writes the summary instead

# The summary code writes when Gemini can't. Same facts, same fill(), so the same numbers.
CODE_SUMMARY = [
    {"about": "missing_links",
     "text": "Missing links: {missing_links} of {checked} activities ({missing_links_pct}), {missing_links_vs_limit}."},
    {"about": "negative_float",
     "text": "Negative float: {negative_float} of {checked} activities ({negative_float_pct}), {negative_float_vs_limit}."},
    {"about": "high_float", "text": "Float over {high_float_days} working days: {high_float} of {checked} activities "
                                    "({high_float_pct}), {high_float_vs_limit}."},
    {"about": OVERVIEW, "text": "Broken rows in the file: {broken_rows}."},
]


def summarize(facts):
    """Return (points, who wrote them). Every figure in the points comes from `facts`."""
    try:
        settings = read_settings()
    except SettingsError as problem:  # the AI is off or set up wrong: code writes it, and says why
        return fill(CODE_SUMMARY, facts), f"code ({problem})"
    feedback = ""  # empty on the first try
    for _ in range(MAX_TRIES):
        try:
            sentences = gemini.ask_gemini(settings, facts, feedback)
        except Exception as error:  # no internet, bad key, quota, timeout, empty reply: fall back, never crash
            return fill(CODE_SUMMARY, facts), f"code (Gemini failed: {gemini.reason(error)[:MAX_REASON_SHOWN]})"
        issues = problems(sentences, facts)
        if not issues:  # every rule holds, so every figure will come from code
            return fill(sentences, facts), f"Gemini ({settings.model})"
        # Show Gemini its answer and what was wrong with it, then try once more.
        feedback = f"Your last answer was:\n{json.dumps(sentences)}\nIt broke these rules:\n" + "\n".join(issues)
    return fill(CODE_SUMMARY, facts), f"code (Gemini broke a rule twice: {issues[0][:MAX_REASON_SHOWN]})"
