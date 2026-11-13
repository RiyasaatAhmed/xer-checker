"""The Gemini settings (xer_checker/summary/settings.py): read from the environment, and checked."""

import pytest
from dotenv import dotenv_values
from helpers import REPO_ROOT

from xer_checker.summary import settings


def test_no_key_is_an_error_that_points_to_the_example_file():
    with pytest.raises(settings.SettingsError, match="no GEMINI_API_KEY; see .env.example"):
        settings.read_settings()


def test_settings_are_trimmed_and_thinking_level_is_read(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "  test-key \n")
    monkeypatch.setenv(settings.MODEL_VAR, " gemini-test ")
    monkeypatch.setenv(settings.THINKING_VAR, "MINIMAL")
    assert settings.read_settings() == settings.Settings("test-key", "gemini-test", "minimal")


def test_empty_thinking_level_means_the_models_own_default(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv(settings.MODEL_VAR, "gemini-test")
    monkeypatch.setenv(settings.THINKING_VAR, "")
    assert settings.read_settings().thinking_level is None


def test_env_example_documents_every_setting_and_holds_no_key():
    example = dotenv_values(REPO_ROOT / ".env.example")
    assert {"GEMINI_API_KEY", settings.MODEL_VAR, settings.THINKING_VAR} <= example.keys()
    assert example[settings.MODEL_VAR]  # a working model, so copying the file is enough
    assert example[settings.THINKING_VAR] in settings.THINKING_LEVELS
    key = example["GEMINI_API_KEY"] or ""
    assert not key or key.startswith("<"), "a real key must never be in the public example file"
