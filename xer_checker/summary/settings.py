"""Read the Gemini settings from the environment, and check them.

Settings live in the environment, not in the code: copy .env.example to .env and fill it in.
.env is gitignored, so the key stays on your machine.
"""

import os  # reads the settings from environment variables
from dataclasses import dataclass  # holds the checked settings
from pathlib import Path  # finds the .env file at the top of the project

from dotenv import load_dotenv  # copies the settings in .env into the environment variables

# ---------- Constants ----------

# Names of the environment variables, all documented in .env.example
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"  # next to checker.py; gitignored
API_KEY_VARS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")  # can hold the key, checked in this order
MODEL_VAR = "GEMINI_MODEL"  # the model that writes the summaries; required with a key
THINKING_VAR = "GEMINI_THINKING_LEVEL"  # optional: how much the model thinks before answering
THINKING_LEVELS = ("minimal", "low", "medium", "high")  # what THINKING_VAR accepts; empty = model's default

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
