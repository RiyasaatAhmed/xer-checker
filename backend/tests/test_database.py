"""The database connection (database/db.py)."""

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from database import db
from modules.uploads.model import FileIssue, Upload


def test_without_database_url_it_uses_a_local_sqlite_file(monkeypatch):
    monkeypatch.delenv(db.DATABASE_URL_VAR, raising=False)
    monkeypatch.setattr(db, "_engine", None)
    assert str(db.get_engine().url) == db.LOCAL_DATABASE_URL
    monkeypatch.setattr(db, "_engine", None)  # the next test makes its own


def test_init_db_creates_every_table_and_can_run_twice(db_session):
    db.init_db(db_session.get_bind())  # a second time: changes nothing
    tables = set(inspect(db_session.get_bind()).get_table_names())
    assert tables == {"uploads", "file_issues", "metric_results", "metric_result_activities", "reviews"}


def test_deleting_an_upload_deletes_its_rows(db_session):
    upload = Upload(file_name="a.xer", size_bytes=1, sha256="x", status="ready")
    db_session.add(upload)
    db_session.commit()
    db_session.add(FileIssue(upload_id=upload.id, line_number=1, severity="error", message="bad"))
    db_session.commit()
    db_session.delete(upload)
    db_session.commit()
    assert db_session.exec(select(FileIssue)).all() == []  # ON DELETE CASCADE


def test_an_unknown_status_is_refused(db_session):
    engine = db_session.get_bind()
    with Session(engine) as session, pytest.raises(IntegrityError):
        session.add(Upload(file_name="a.xer", size_bytes=1, sha256="x", status="maybe"))
        session.commit()
