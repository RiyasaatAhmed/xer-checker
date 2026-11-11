"""Shared test setup: no test ever calls Gemini, whatever is in your .env."""

import pytest

import summary


@pytest.fixture(autouse=True)
def no_real_ai_settings(monkeypatch):
    """Clear the Gemini settings before every test, so a real .env never leaks into one."""
    for var in (*summary.API_KEY_VARS, summary.MODEL_VAR, summary.THINKING_VAR):
        monkeypatch.delenv(var, raising=False)
