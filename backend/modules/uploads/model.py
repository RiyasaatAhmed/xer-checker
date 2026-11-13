"""The tables for uploads and their results. A subset of planning's database design.

  uploads                    one row per file, never changed after it's checked
  file_issues                broken rows and notes, with their line numbers
  metric_results             one row per DCMA rule: the value and its working (numerator, denominator)
  metric_result_activities   the activities behind each number
  reviews                    the summary, who wrote it, and the exact facts it was written from

Deleting an upload deletes everything from it (ON DELETE CASCADE).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, CheckConstraint, Column, DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


def now():
    """The current time, in UTC."""
    return datetime.now(timezone.utc)


def created_at_field():
    """A time column, saved with its time zone."""
    return Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))


class Upload(SQLModel, table=True):
    """One uploaded file."""
    __tablename__ = "uploads"
    __table_args__ = (CheckConstraint("status IN ('ready', 'failed')", name="uploads_status"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)  # random, so it's safe in a link
    file_name: str
    size_bytes: int
    sha256: str  # the file's fingerprint: the same file always gives the same value
    status: str  # ready, or failed when the file can't be checked
    failure_reason: str | None = None  # plain words, shown to the user
    created_at: datetime = created_at_field()


class FileIssue(SQLModel, table=True):
    """A broken row (error) or a row read with blanks (note)."""
    __tablename__ = "file_issues"
    __table_args__ = (CheckConstraint("severity IN ('error', 'note')", name="file_issues_severity"),)

    id: int | None = Field(default=None, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", index=True)
    line_number: int
    severity: str
    message: str


class MetricResult(SQLModel, table=True):
    """One DCMA rule's result for one upload, saved with its working."""
    __tablename__ = "metric_results"
    __table_args__ = (
        CheckConstraint("verdict IN ('pass', 'flag', 'not_applicable')", name="metric_results_verdict"),
        UniqueConstraint("upload_id", "metric_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", index=True)
    metric_id: str  # the rule's file name, like "missing_links"
    name: str  # like "Missing links"
    dcma_section: str  # like "4.1"
    position: int  # the order the report shows the rules in
    limit_value: float  # DCMA flags the schedule above this %
    value: float  # numerator as a % of denominator
    numerator: int  # activities that break the rule
    denominator: int  # activities checked
    verdict: str  # pass, flag, or not_applicable when nothing was checked
    computed_at: datetime = created_at_field()


class MetricResultActivity(SQLModel, table=True):
    """One activity behind a number. Kept in the order the checker found them."""
    __tablename__ = "metric_result_activities"

    metric_result_id: uuid.UUID = Field(foreign_key="metric_results.id", ondelete="CASCADE", primary_key=True)
    position: int = Field(primary_key=True)  # an activity ID can repeat when a file holds 2 P6 projects
    activity_code: str  # the activity ID schedulers see in P6


class Review(SQLModel, table=True):
    """The written summary of one upload."""
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("written_by IN ('ai', 'code')", name="reviews_written_by"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", unique=True)
    written_by: str  # ai or code
    author_note: str  # like "Gemini (gemini-3.5-flash-lite)" or "code (no GEMINI_API_KEY; see .env.example)"
    facts: dict = Field(sa_column=Column(JSON, nullable=False))  # the exact numbers it was written from
    points: list = Field(sa_column=Column(JSON, nullable=False))  # the points, numbers filled in
    created_at: datetime = created_at_field()
