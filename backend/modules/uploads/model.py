"""The tables for uploads and their results. A subset of planning's database design.

  uploads                    one row per file, never changed after it's checked
  file_issues                broken rows and notes, with their line numbers
  metric_results             one row per DCMA rule: the value and its working (numerator, denominator)
  metric_result_activities   the activities behind each number
  reviews                    the summary, who wrote it, and the exact facts it was written from
  schedule_projects          the P6 projects in the file: data date, deadline, forecast finish
  activities                 every activity: ID, name, WBS, status, float, duration, dates
  relationships              every link row in the file, and whether it's counted (one per pair)

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


def site_time_field():
    """A P6 date: site-local with no time zone, as P6 writes it. Converting would move dates by a day."""
    return Field(default=None, sa_column=Column(DateTime(timezone=False), nullable=True))


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


class ScheduleProject(SQLModel, table=True):
    """One P6 project in an uploaded file."""
    __tablename__ = "schedule_projects"

    id: int | None = Field(default=None, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", index=True)
    p6_id: str  # PROJECT.proj_id
    name: str  # proj_short_name
    data_date: datetime | None = site_time_field()  # the "as of" date
    planned_start: datetime | None = site_time_field()
    deadline: datetime | None = site_time_field()  # plan_end_date; often blank
    forecast_finish: datetime | None = site_time_field()


class Activity(SQLModel, table=True):
    """One activity in an uploaded file, as read from TASK."""
    __tablename__ = "activities"

    id: int | None = Field(default=None, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", index=True)
    p6_task_id: str  # P6's internal key; links use it
    activity_code: str  # the activity ID schedulers see
    name: str
    wbs: str  # the WBS element's name
    task_type: str  # TT_Task, TT_Mile, ...
    status: str  # TK_NotStart, TK_Active, TK_Complete
    checked: bool  # one of the activities DCMA checks
    float_days: float | None = None  # total float, in working days on its own calendar
    duration_days: float | None = None  # remaining duration, in working days
    start: datetime | None = site_time_field()  # actual start, else early start
    finish: datetime | None = site_time_field()  # actual finish, else early finish
    constraint_type: str  # cstr_type, blank when none
    source_line: int  # its line in the file


class Relationship(SQLModel, table=True):
    """One link row in an uploaded file, as read from TASKPRED."""
    __tablename__ = "relationships"
    __table_args__ = (CheckConstraint("link_type IN ('PR_FS', 'PR_SS', 'PR_FF', 'PR_SF', '')", name="relationships_link_type"),)

    id: int | None = Field(default=None, primary_key=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", ondelete="CASCADE", index=True)
    pred_p6_task_id: str  # the earlier activity
    succ_p6_task_id: str  # the later activity
    link_type: str
    lag_hours: float  # below 0 is a lead, above 0 a lag
    counted: bool  # False for a pair's earlier row when the file links the pair twice
    source_line: int
