"""The shapes of the API's answers about uploads."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ActivityRow(BaseModel):
    """One activity behind a number, as a scheduler finds it in P6."""
    code: str = Field(description="The activity ID")
    name: str
    wbs: str = Field(description="The WBS element's name")
    status: str = Field(description="Not started, In progress or Complete")
    float_days: float | None = Field(description="Total float in working days, on the activity's own calendar")
    duration_days: float | None = Field(description="Remaining duration in working days")
    predecessors: int = Field(default=0, description="Links into it: 0 means nothing comes before it")
    successors: int = Field(default=0, description="Links out of it: 0 means nothing comes after it")
    start: datetime | None = Field(description="Actual start, else early start; site-local, no time zone")
    finish: datetime | None = Field(description="Actual finish, else early finish; site-local, no time zone")


class RuleResult(BaseModel):
    """One DCMA rule's result."""
    name: str = Field(description="The check, like 'Missing links'")
    dcma_section: str = Field(description="Where the rule is in DCMA-EA PAM 200.1, like '4.1'")
    limit_percent: float = Field(description="DCMA flags the schedule above this %")
    count: int = Field(description="Activities that break the rule")
    percent: float = Field(description="count as a % of the activities checked, rounded to 1 decimal")
    status: Literal["pass", "flag", "n/a"] = Field(description="n/a when nothing was checked")
    activities: list[str] = Field(description="The activity IDs that break the rule")
    details: list[ActivityRow] = Field(default=[], description="The same activities, with name, WBS, float and dates")


class RowNote(BaseModel):
    """A row the checker couldn't use, or read with blanks."""
    line: int = Field(description="Line number in the file")
    message: str = Field(description="What is wrong with the row")


class ProjectInfo(BaseModel):
    """One P6 project in the file. Dates are site-local, as P6 writes them."""
    name: str
    data_date: datetime | None = Field(description="The 'as of' date: before it is actual, after it is forecast")
    planned_start: datetime | None
    deadline: datetime | None = Field(description="The 'must finish by' date; often blank")
    forecast_finish: datetime | None = Field(description="P6's calculated finish")


class Part(BaseModel):
    """One slice of a total: a status, a type, a link type."""
    key: str = Field(description="P6's code, like TK_Active or PR_FS")
    label: str
    count: int
    percent: float = Field(description="count as a % of its own total, rounded to 1 decimal")


class FloatBand(BaseModel):
    key: str
    label: str
    count: int


class Overview(BaseModel):
    """What's in the schedule, counted. Facts read from the file, not pass or fail."""
    activities: int
    checked: int = Field(description="The activities DCMA checks")
    by_status: list[Part]
    by_type: list[Part]
    links: int = Field(description="Counted links: one per pair of activities")
    duplicate_links: int = Field(description="Rows that link a pair twice; the later row is counted, as Kazinex does")
    by_link_type: list[Part]
    leads: int
    lags: int
    constraints: int
    by_constraint: list[Part]
    float_profile: list[FloatBand] = Field(description="The checked activities by total float")
    no_float: int = Field(description="Checked activities with a blank float")


class CheckResult(BaseModel):
    """Everything the checker found in one file, as saved."""
    upload_id: uuid.UUID = Field(description="Open it again with GET /api/uploads/{upload_id}")
    uploaded_at: datetime
    file_name: str
    checked: int = Field(description="Unfinished work activities checked")
    rules: list[RuleResult] = Field(description="One result per DCMA rule, in report order")
    broken_rows: list[RowNote] = Field(description="Rows that couldn't be used, in line order")
    notes: list[RowNote] = Field(description="Rows that ended early and were read with blanks")
    summary: list[str] = Field(description="Short points; every number in them is filled in by code")
    summary_author: str = Field(description="Gemini, or code and why")
    projects: list[ProjectInfo] = Field(default=[], description="The P6 projects in the file")
    overview: Overview | None = Field(default=None, description="None for an upload saved before the schedule was kept")


class UploadSummary(BaseModel):
    """One upload in the list of recent uploads."""
    upload_id: uuid.UUID
    uploaded_at: datetime
    file_name: str
    status: Literal["ready", "failed"]
    failure_reason: str | None = Field(description="Why the file couldn't be checked")
    checked: int | None = Field(description="Activities checked; None when the upload failed")
    flags: int | None = Field(description="Rules over their DCMA limit; None when the upload failed")
