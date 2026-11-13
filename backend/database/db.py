"""Connect to the database, hand each request a session, and create the tables.

DATABASE_URL picks the database:
  Docker Compose    PostgreSQL, set in docker-compose.yml
  Not set           a SQLite file next to main.py, so the API runs without Docker
"""

import os  # reads DATABASE_URL

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

# ---------- Constants ----------

DATABASE_URL_VAR = "DATABASE_URL"  # the environment variable that holds the address
LOCAL_DATABASE_URL = "sqlite:///./xer_checker.db"  # used when DATABASE_URL isn't set; gitignored

_engine = None  # made once, on first use


def get_engine():
    """The one engine for this process: a pool of connections to the database."""
    global _engine
    if _engine is None:
        _engine = make_engine(os.environ.get(DATABASE_URL_VAR) or LOCAL_DATABASE_URL)
    return _engine


def make_engine(url, **options):
    """An engine for `url`. SQLite gets foreign keys turned on, so deletes cascade like in PostgreSQL."""
    engine = create_engine(url, **options)
    if url.startswith("sqlite"):
        event.listen(engine, "connect", lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"))
    return engine


def init_db(engine=None):
    """Create any table that doesn't exist yet. Existing tables and their rows are left alone."""
    import modules.uploads.model  # noqa: F401  (registers the tables before they're created)

    SQLModel.metadata.create_all(engine or get_engine())


def get_session():
    """One session per request (a FastAPI dependency). It's closed when the request ends."""
    with Session(get_engine()) as session:
        yield session
