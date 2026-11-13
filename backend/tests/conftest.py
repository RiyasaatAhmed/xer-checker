"""Shared test setup: no test ever calls Gemini or touches a real database."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session

from database.db import get_session, init_db, make_engine
from main import app
from xer_checker.summary import settings


@pytest.fixture(autouse=True)
def no_real_ai_settings(monkeypatch):
    """Clear the Gemini settings before every test, so a real .env never leaks into one."""
    for var in (*settings.API_KEY_VARS, settings.MODEL_VAR, settings.THINKING_VAR):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def db_session():
    """A fresh, empty database in memory, for one test."""
    engine = make_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    init_db(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(db_session):
    """An API client whose requests use the test's database."""
    app.dependency_overrides[get_session] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()
