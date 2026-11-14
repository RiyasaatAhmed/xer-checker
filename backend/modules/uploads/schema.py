"""The shapes of the API's answers about uploads."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Neighbor(BaseModel):
    """An activity next to another in the logic: one link away."""
    code: str
    name: str
    link_type: str = Field(description="PR_FS, PR_SS, PR_FF or PR_SF")
    lag_hours: float = Field(description="Below 0 is a lead, above 0 a lag")


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
    before: list[Neighbor] = Field(default=[], description="Up to 4 of the activities linked before it")
    after: list[Neighbor] = Field(default=[], description="Up to 4 of the activities linked after it")
    start: datetime | None = Field(description="Actual start, else early start; site-local, no time zone")
    finish: datetime | None = Field(description="Actual finish, else early finish; site-local, no time zone")
    kind: str = Field(default="", description="Which kind of this check's activities it is; the keys are in RuleResult.kinds")
    fails: int = Field(default=1, description="How many checks flag this activity")
    failed: list[str] = Field(default=[], description="The IDs of the checks that flag this activity")


class Kind(BaseModel):
    """One kind of activity behind a check, with the color tone it is drawn in."""
    key: str
    label: str
    tone: str = Field(description="A CSS class suffix: t-<tone>")


class RuleResult(BaseModel):
    """One check's result. The activities behind it come from GET /api/uploads/{id}/checks/{check id}."""
    id: str = Field(description="A stable slug, like 'missing-links'. Links and words use it")
    name: str = Field(description="The check, like 'Missing links'")
    group: str = Field(description="The set it belongs to: Logic, Constraints, Float, Duration, Dates, Resources or Execution")
    measure: Literal["percent", "index", "test"] = Field(description="A share of activities, a ratio, or pass or fail")
    direction: Literal["above", "below"] = Field(description="Flagged above the limit, or under it")
    severity: int = Field(description="1 minor, 2 serious, 3 critical. Ranks checks over their limit")
    dcma_section: str = Field(description="Where the rule is in DCMA-EA PAM 200.1, like '4.1'. Blank for a check that isn't DCMA's")
    limit_percent: float = Field(description="The limit: a % of activities, or an index for the 'index' measure")
    count: int = Field(description="Activities that break the rule")
    percent: float = Field(description="count as a % of the activities checked, rounded to 1 decimal")
    status: Literal["pass", "flag", "n/a"] = Field(description="n/a when nothing was checked or the file can't support the check")
    na_reason: str | None = Field(default=None, description="Why the check could not run. Only when status is n/a")
    kinds: list[Kind] = Field(default=[], description="The kinds of activity behind this check")
    activities: list[str] = Field(default=[], description="Empty here. The activity IDs are in the check's own call")
    details: list[ActivityRow] = Field(default=[], description="Empty here. The rows are in the check's own call")


class CheckActivities(BaseModel):
    """The activities behind one check, with their logic."""
    id: str
    activities: list[str] = Field(description="The activity IDs that break the rule, in the order the checker found them")
    details: list[ActivityRow] = Field(description="The same activities, with name, WBS, float, dates and kind")


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


class WbsGroup(BaseModel):
    """One WBS group with its subtree's numbers: where the problems are, and when the work happens."""
    id: str
    parent_id: str | None = Field(description="The group it sits in; None for the root")
    name: str
    depth: int = Field(description="0 for the root")
    checked: int = Field(description="Activities DCMA checks, in this group and the groups inside it")
    flagged: int = Field(description="How many of those any DCMA rule flags")
    by_rule: list[int] = Field(description="Flagged, per rule, in the order of CheckResult.rules")
    by_group: dict[str, int] = Field(default={}, description="Activities flagged by at least one check of each group")
    complete: int = Field(default=0, description="Finished activities in the group")
    total: int = Field(default=0, description="All activities in the group, checked or not")
    heat: list[list[int]] = Field(default=[], description="Flagged activities starting in each month: heat[rule][month]")
    start: datetime | None = Field(description="Earliest start in the group; site-local, no time zone")
    finish: datetime | None = Field(description="Latest finish in the group")


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
    float_bands: list[FloatBand] = Field(default=[], description="Finer float bands for the float picture")
    lowest_float: float | None = Field(default=None, description="The least float of any checked activity, in days")
    left_out: list[FloatBand] = Field(default=[], description="Activities DCMA leaves out of the checks, by reason")
    driving_count: int | None = Field(default=None, description="Checked activities at the lowest float: the driving path")
    driving_wbs: str | None = Field(default=None, description="The WBS that holds most of the driving path")


class Previous(BaseModel):
    """The last earlier upload of the same file, for the change since then."""
    upload_id: uuid.UUID
    uploaded_at: datetime
    values: dict[str, float] = Field(description="Its percent for each check, by check ID. A check that couldn't run is left out")


class OpenEnd(BaseModel):
    """An activity with nothing after it, and the flagged activities that lead only into it."""
    code: str
    name: str
    wbs: str
    clears: int = Field(description="Flagged activities that lead only into it, itself included")


class Repeat(BaseModel):
    """An activity that more than one check flags."""
    code: str
    name: str
    wbs: str
    fails: int = Field(description="How many checks flag it")
    checks: list[str] = Field(default=[], description="The IDs of the checks that flag it")


class FixFirst(BaseModel):
    """Where one fix helps most."""
    open_ends: list[OpenEnd] = Field(default=[], description="One missing link that may clear many flags")
    repeat_offenders: list[Repeat] = Field(default=[], description="Activities that fail the most checks")


class CheckResult(BaseModel):
    """Everything the checker found in one file, as saved."""
    upload_id: uuid.UUID = Field(description="Open it again with GET /api/uploads/{upload_id}")
    uploaded_at: datetime
    file_name: str
    checked: int = Field(description="Unfinished work activities checked")
    rules: list[RuleResult] = Field(description="One result per check, in report order")
    broken_rows: list[RowNote] = Field(description="Rows that couldn't be used, in line order")
    notes: list[RowNote] = Field(description="Rows that ended early and were read with blanks")
    summary: list[str] = Field(description="Short points; every number in them is filled in by code")
    summary_author: str = Field(description="Gemini, or code and why")
    projects: list[ProjectInfo] = Field(default=[], description="The P6 projects in the file")
    overview: Overview | None = Field(default=None, description="None for an upload saved before the schedule was kept")
    structure: list[WbsGroup] = Field(default=[], description="The WBS tree, in tree order. Empty for an upload saved before it was kept")
    months: list[str] = Field(default=[], description="The month axis of WbsGroup.heat, like '2026-07'")
    previous: Previous | None = Field(default=None, description="The last earlier upload of the same file, if any")
    fix_first: FixFirst = Field(default=FixFirst(), description="Where one fix helps most")


class CheckStatus(BaseModel):
    """One check's status, for the strip on the upload list."""
    id: str
    name: str
    group: str
    status: Literal["pass", "flag", "n/a"]
    severity: int = Field(default=1, description="1 minor, 2 serious, 3 critical")


class UploadSummary(BaseModel):
    """One upload in the list of recent uploads."""
    upload_id: uuid.UUID
    uploaded_at: datetime
    file_name: str
    status: Literal["ready", "failed"]
    failure_reason: str | None = Field(description="Why the file couldn't be checked")
    checked: int | None = Field(description="Activities checked; None when the upload failed")
    flags: int | None = Field(description="Checks over their limit; None when the upload failed")
    broken_rows: int | None = Field(default=None, description="Rows the checker couldn't use; None when the upload failed")
    projects: int | None = Field(default=None, description="How many P6 projects the file holds")
    checks: list[CheckStatus] = Field(default=[], description="Every check's status, in report order")
    project: str | None = Field(default=None, description="The first P6 project's name")
    data_date: datetime | None = Field(default=None, description="The first project's data date")
    forecast_finish: datetime | None = None
    deadline: datetime | None = None
