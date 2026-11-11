"""Write a short summary of one file's check results: Gemini picks the words, code fills in every number.

How it stops the AI from inventing a figure:
  1. checker.py computes the facts and hands them over by name, like {"missing_links": "20"}.
  2. Gemini replies in a fixed JSON shape: each sentence says which check it's about, then points
     at facts, like "{missing_links} activities have no link ...". It never types a number itself.
  3. problems() checks every sentence against the rules below. If one breaks a rule, Gemini
     gets one more try and is told exactly what was wrong.
  4. fill() swaps each {fact} for its value from code, so every figure in the summary comes from code.
If a setting is missing, the call fails, or both tries break a rule, code writes the summary from
the same facts instead, and says why. The checker never depends on the AI.

Gemini only sees the facts: no activity names and nothing else from the file, so text inside
a schedule can't give it instructions.

Settings live in the environment, not in this code: copy .env.example to .env and fill it in.
.env is gitignored, so the key stays on your machine.
"""

import functools  # keeps one Gemini client for the whole run
import json  # sends Gemini the facts, and reads its reply
import os  # reads the settings from environment variables
import re  # finds {facts}, digits and amount words in Gemini's sentences
from dataclasses import dataclass  # holds the checked settings
from pathlib import Path  # finds the .env and prompt files next to this one

from dotenv import load_dotenv  # copies the settings in .env into the environment variables

# ---------- Constants ----------

# Settings: names of the environment variables, all documented in .env.example
ENV_FILE = Path(__file__).parent / ".env"  # your settings go here; gitignored
API_KEY_VARS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")  # can hold the key, checked in this order
MODEL_VAR = "GEMINI_MODEL"  # the model that writes the summaries; required with a key
THINKING_VAR = "GEMINI_THINKING_LEVEL"  # optional: how much the model thinks before answering
THINKING_LEVELS = ("minimal", "low", "medium", "high")  # what THINKING_VAR accepts; empty = model's default

# Gemini calls
TIMEOUT_MS = 30_000  # give up on a Gemini call after 30 seconds
API_ATTEMPTS = 3  # Google sometimes answers "busy": try up to 3 times, waiting 1 to 4 seconds between
RETRY_STATUS_CODES = (429, 500, 502, 503)  # busy or rate-limited. Not 504: a timeout won't get faster
MAX_RETRY_WAIT = 4.0  # seconds
MAX_TRIES = 2  # the first try, plus one retry that says what was wrong
MAX_REASON_SHOWN = 60  # characters of an error shown when code writes the summary instead

# Shape of the summary
MAX_SENTENCES = 4  # points per file: short enough to fit under the chart (the instructions ask for 2 to 4)
MAX_SENTENCE_LENGTH = 250  # characters
MAX_POINT_WORDS = 25  # one point is one short sentence
MORE_THAN_ONE_SENTENCE = re.compile(r"[.!?]\s+\S|;")  # a sentence ends and another starts, or a ";" joins two
OWN_JUDGEMENT = re.compile(r"\b(limits?|thresholds?)\b", re.IGNORECASE)  # only _vs_limit may say this
FILLER = re.compile(r"\b(additionally|furthermore|moreover|meanwhile|overall|notably|importantly|"
                    r"in summary|in conclusion|it'?s worth noting|it is worth noting)\b", re.IGNORECASE)
OVERVIEW = "overview"  # what a sentence about the file as a whole is "about"
OVERVIEW_FACTS = ("broken_rows",)  # the facts an overview sentence may use: rows, never activities
SHARED_FACTS = ("checked",)  # a fact any sentence may use: the number the shares are out of

# What Gemini may not write itself, because a figure has to come from a {fact}
FACT = re.compile(r"\{(\w+)\}")  # a fact name in braces, like {missing_links}
DIGIT = re.compile(r"\d")  # a number typed in digits
NUMBER_WORDS = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
                "fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy "
                "eighty ninety hundred hundreds thousand thousands million half halves third thirds "
                "quarter quarters twice double triple dozen dozens percent")
AMOUNT_WORDS = "all most majority minority none every nearly almost few many several single couple handful"
WORD = re.compile(r"\b(" + "|".join((NUMBER_WORDS + " " + AMOUNT_WORDS).split()) + r")\b", re.IGNORECASE)

# Gemini's instructions live in their own file, so they read (and get reviewed) like a document.
RULES = (Path(__file__).parent / "summary_prompt.md").read_text()

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


# ---------- Settings ----------

# Read .env into the environment once, when this file is imported. No .env file is fine: the AI
# stays off. A variable already set in the terminal wins, so `GEMINI_API_KEY= python checker.py`
# turns the AI off for one run.
load_dotenv(ENV_FILE)


@dataclass(frozen=True)
class Settings:
    """The Gemini settings, read from the environment and checked."""
    api_key: str
    model: str
    thinking_level: str | None  # None: the model's own default


class SettingsError(Exception):
    """A missing or invalid setting. The message names it and points to .env.example."""


def read_settings():
    """Read the Gemini settings from the environment (.env included), and check them.

    Raises SettingsError when the AI can't run, so code writes the summary and says why.
    """
    api_key = next((os.environ[var].strip() for var in API_KEY_VARS if os.environ.get(var, "").strip()), None)
    if not api_key:  # the AI is off
        raise SettingsError(f"no {API_KEY_VARS[0]}; see .env.example")
    model = os.environ.get(MODEL_VAR, "").strip()
    if not model:  # no model in the code to fall back on: the environment decides
        raise SettingsError(f"no {MODEL_VAR}; see .env.example")
    thinking_level = os.environ.get(THINKING_VAR, "").strip().lower() or None
    if thinking_level not in (None, *THINKING_LEVELS):  # the SDK would only warn, and send it anyway
        raise SettingsError(f"{THINKING_VAR} must be {', '.join(THINKING_LEVELS)} or empty")
    return Settings(api_key, model, thinking_level)


# ---------- The summary ----------

def summarize(facts):
    """Return (points, who wrote them). Every figure in the points comes from `facts`."""
    try:
        settings = read_settings()
    except SettingsError as problem:  # the AI is off or set up wrong: code writes it, and says why
        return fill(CODE_SUMMARY, facts), f"code ({problem})"
    feedback = ""  # empty on the first try
    for _ in range(MAX_TRIES):
        try:
            sentences = ask_gemini(settings, facts, feedback)
        except Exception as error:  # no internet, bad key, quota, timeout, empty reply: fall back, never crash
            return fill(CODE_SUMMARY, facts), f"code (Gemini failed: {reason(error)})"
        issues = problems(sentences, facts)
        if not issues:  # every rule holds, so every figure will come from code
            return fill(sentences, facts), f"Gemini ({settings.model})"
        # Show Gemini its answer and what was wrong with it, then try once more.
        feedback = f"Your last answer was:\n{json.dumps(sentences)}\nIt broke these rules:\n" + "\n".join(issues)
    return fill(CODE_SUMMARY, facts), f"code (Gemini broke a rule twice: {issues[0][:MAX_REASON_SHOWN]})"


def ask_gemini(settings, facts, feedback):
    """Send Gemini the facts and return its sentences, still with {facts} in them."""
    from google.genai import types  # imported here, so the checker still runs without the AI library

    request = "Facts:\n" + json.dumps(facts, indent=2)
    if feedback:  # on the retry, say exactly what to fix
        request += "\n\n" + feedback
    thinking = types.ThinkingConfig(thinking_level=settings.thinking_level) if settings.thinking_level else None
    reply = gemini_client(settings.api_key).models.generate_content(
        model=settings.model,
        contents=request,
        config=types.GenerateContentConfig(
            system_instruction=RULES,
            response_mime_type="application/json",  # reply in JSON...
            response_json_schema=reply_schema(facts),  # ...in this exact shape
            thinking_config=thinking,  # None: the model's own default
        ),
    )
    answer = json.loads(reply.text)
    return answer.get("sentences") if isinstance(answer, dict) else answer  # problems() checks the shape


def reply_schema(facts):
    """The JSON shape Gemini must reply in. "about" comes before "text", so it picks a topic first."""
    sentence = {"type": "object", "required": ["about", "text"], "properties": {
        "about": {"type": "string", "enum": [OVERVIEW, *check_names(facts)]},  # only these values are allowed
        "text": {"type": "string"},
    }}
    return {"type": "object", "required": ["sentences"], "properties": {
        "sentences": {"type": "array", "minItems": 1, "maxItems": MAX_SENTENCES, "items": sentence},
    }}


def check_names(facts):
    """The checks the facts cover, like "missing_links": every fact name that ends in _vs_limit."""
    return [name.removesuffix("_vs_limit") for name in facts if name.endswith("_vs_limit")]


def belongs(fact, about):
    """May a sentence about `about` use this fact? Its own check's facts, plus the shared ones."""
    if about == OVERVIEW:
        return fact in OVERVIEW_FACTS
    if fact in SHARED_FACTS:
        return True
    return fact == about or fact.startswith(about + "_")


@functools.cache
def gemini_client(api_key):
    """One Gemini client per key, made on first use and then reused, with its open connections."""
    from google import genai  # imported here, so the checker still runs without the AI library
    from google.genai import types

    return genai.Client(api_key=api_key, http_options=http_options())


def http_options():
    """Time limit and retries for every Gemini call."""
    from google.genai import types  # imported here, so the checker still runs without the AI library

    retry = types.HttpRetryOptions(attempts=API_ATTEMPTS, max_delay=MAX_RETRY_WAIT,
                                   http_status_codes=list(RETRY_STATUS_CODES))
    return types.HttpOptions(timeout=TIMEOUT_MS, retry_options=retry)


def problems(sentences, facts):
    """List every rule the sentences break. An empty list means they're safe to fill in."""
    if not isinstance(sentences, list) or not 1 <= len(sentences) <= MAX_SENTENCES:
        return [f"the reply must have 1 to {MAX_SENTENCES} sentences"]
    topics = (OVERVIEW, *check_names(facts))
    issues = []
    for n, item in enumerate(sentences, start=1):
        if not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip():
            issues.append(f"sentence {n} needs an \"about\" and some \"text\"")
            continue
        about, sentence = item.get("about"), item["text"]
        if about not in topics:
            issues.append(f"sentence {n} is about {about!r}; use one of: {', '.join(topics)}")
        names = FACT.findall(sentence)  # the facts this sentence points at
        own_words = FACT.sub("", sentence)  # everything Gemini wrote itself
        if DIGIT.search(own_words):
            issues.append(f"sentence {n} has a number in digits; use a fact in braces instead")
        if word := WORD.search(own_words):
            issues.append(f"sentence {n} says {word.group(0)!r}; use a fact in braces instead")
        if "%" in own_words:
            issues.append(f"sentence {n} has a % sign; the _pct facts already include it")
        if "{" in own_words or "}" in own_words:
            issues.append(f"sentence {n} has a brace that isn't around a fact name")
        bare = [name for name in facts if "_" in name and re.search(rf"\b{name}\b", own_words)]
        if bare:  # a fact name typed as a word: it would show up as "missing_links"
            issues.append(f"sentence {n} writes {bare[0]} without braces; write {{{bare[0]}}}")
        unknown = [name for name in names if name not in facts]
        if unknown:
            issues.append(f"sentence {n} uses a fact that doesn't exist: {unknown[0]}")
        elsewhere = [name for name in names if name in facts and about in topics and not belongs(name, about)]
        if elsewhere:  # the right number in the wrong sentence
            issues.append(f"sentence {n} is about {about} but uses {{{elsewhere[0]}}}; give that its own sentence")
        if not names:
            issues.append(f"sentence {n} doesn't use any fact")
        if len(sentence) > MAX_SENTENCE_LENGTH:
            issues.append(f"sentence {n} is longer than {MAX_SENTENCE_LENGTH} characters")
        if MORE_THAN_ONE_SENTENCE.search(own_words):  # one point, one idea
            issues.append(f"sentence {n} holds more than one sentence; make it one point with one idea")
        if len(sentence.split()) > MAX_POINT_WORDS:
            issues.append(f"sentence {n} has more than {MAX_POINT_WORDS} words; make it shorter")
        if judgement := OWN_JUDGEMENT.search(own_words):
            issues.append(f"sentence {n} says {judgement.group(0)!r} itself; the _vs_limit fact already says it")
        if filler := FILLER.search(own_words):  # words that make a summary sound machine-written
            issues.append(f"sentence {n} says {filler.group(0)!r}; state the finding directly")
    covered = {item.get("about") for item in sentences if isinstance(item, dict)}
    for check in check_names(facts):  # a check over its limit can't be left out
        if facts[check + "_vs_limit"].startswith("over") and check not in covered:
            issues.append(f"no sentence is about {check}, which is over its limit")
    return issues


def fill(sentences, facts):
    """Swap each {fact} for its value from code. Returns the points, one sentence each."""
    return [FACT.sub(lambda match: facts[match.group(1)], s["text"].strip()) for s in sentences]


def reason(error):
    """A short, readable reason for a failed Gemini call."""
    if getattr(error, "status", None) == "DEADLINE_EXCEEDED":  # Google's server stopped at our time limit
        return f"no answer within {TIMEOUT_MS // 1000} seconds"
    text = getattr(error, "message", None) or str(error) or type(error).__name__  # API errors carry .message
    return text.splitlines()[0][:MAX_REASON_SHOWN]
