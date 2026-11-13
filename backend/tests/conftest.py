"""Shared test setup: no test ever calls Gemini, whatever is in your .env."""

import pytest

from xer_checker.summary import settings


@pytest.fixture(autouse=True)
def no_real_ai_settings(monkeypatch):
    """Clear the Gemini settings before every test, so a real .env never leaks into one."""
    for var in (*settings.API_KEY_VARS, settings.MODEL_VAR, settings.THINKING_VAR):
        monkeypatch.delenv(var, raising=False)
