"""The call to Gemini: what's sent, the shape its reply must have, the time limit and the retries."""

import functools  # keeps one Gemini client for the whole run
import json  # sends Gemini the facts, and reads its reply
from pathlib import Path  # finds the prompt file next to this one

from .rules import MAX_SENTENCES, topics

# ---------- Constants ----------

TIMEOUT_MS = 30_000  # give up on a Gemini call after 30 seconds
API_ATTEMPTS = 3  # Google sometimes answers "busy": try up to 3 times, waiting 1 to 4 seconds between
RETRY_STATUS_CODES = (429, 500, 502, 503)  # busy or rate-limited. Not 504: a timeout won't get faster
MAX_RETRY_WAIT = 4.0  # seconds

# Gemini's instructions live in their own file, so they read (and get reviewed) like a document.
PROMPT = (Path(__file__).parent / "prompt.md").read_text()


def ask_gemini(settings, facts, feedback):
    """Send Gemini the facts and return its points, still with {facts} in them."""
    from google.genai import types  # imported here, so the checker still runs without the AI library

    request = "Facts:\n" + json.dumps(facts, indent=2)
    if feedback:  # on the retry, say exactly what to fix
        request += "\n\n" + feedback
    thinking = types.ThinkingConfig(thinking_level=settings.thinking_level) if settings.thinking_level else None
    reply = gemini_client(settings.api_key).models.generate_content(
        model=settings.model,
        contents=request,
        config=types.GenerateContentConfig(
            system_instruction=PROMPT,
            response_mime_type="application/json",  # reply in JSON...
            response_json_schema=reply_schema(facts),  # ...in this exact shape
            thinking_config=thinking,  # None: the model's own default
        ),
    )
    answer = json.loads(reply.text)
    return answer.get("sentences") if isinstance(answer, dict) else answer  # rules.problems() checks the shape


def reply_schema(facts):
    """The JSON shape Gemini must reply in. "about" comes before "text", so it picks a topic first."""
    sentence = {"type": "object", "required": ["about", "text"], "properties": {
        "about": {"type": "string", "enum": list(topics(facts))},  # only these values are allowed
        "text": {"type": "string"},
    }}
    return {"type": "object", "required": ["sentences"], "properties": {
        "sentences": {"type": "array", "minItems": 1, "maxItems": MAX_SENTENCES, "items": sentence},
    }}


@functools.cache
def gemini_client(api_key):
    """One Gemini client per key, made on first use and then reused, with its open connections."""
    from google import genai  # imported here, so the checker still runs without the AI library

    return genai.Client(api_key=api_key, http_options=http_options())


def http_options():
    """Time limit and retries for every Gemini call."""
    from google.genai import types  # imported here, so the checker still runs without the AI library

    retry = types.HttpRetryOptions(attempts=API_ATTEMPTS, max_delay=MAX_RETRY_WAIT,
                                   http_status_codes=list(RETRY_STATUS_CODES))
    return types.HttpOptions(timeout=TIMEOUT_MS, retry_options=retry)


def reason(error):
    """A readable, one-line reason for a failed Gemini call."""
    if getattr(error, "status", None) == "DEADLINE_EXCEEDED":  # Google's server stopped at our time limit
        return f"no answer within {TIMEOUT_MS // 1000} seconds"
    text = getattr(error, "message", None) or str(error) or type(error).__name__  # API errors carry .message
    return text.splitlines()[0]
