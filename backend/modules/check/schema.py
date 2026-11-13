"""The shape of one checked file's answer, as the API sends it."""

from typing import Literal

from pydantic import BaseModel, Field


class RuleResult(BaseModel):
    """One DCMA rule's result."""
    name: str = Field(description="The check, like 'Missing links'")
    dcma_section: str = Field(description="Where the rule is in DCMA-EA PAM 200.1, like '4.1'")
    limit_percent: float = Field(description="DCMA flags the schedule above this %")
    count: int = Field(description="Activities that break the rule")
    percent: float = Field(description="count as a % of the activities checked, rounded to 1 decimal")
    status: Literal["pass", "flag", "n/a"] = Field(description="n/a when nothing was checked")
    activities: list[str] = Field(description="The activity IDs that break the rule")


class RowNote(BaseModel):
    """A row the checker couldn't use, or read with blanks."""
    line: int = Field(description="Line number in the file")
    message: str = Field(description="What is wrong with the row")


class CheckResult(BaseModel):
    """Everything the checker found in one file."""
    file_name: str
    checked: int = Field(description="Unfinished work activities checked")
    rules: list[RuleResult] = Field(description="One result per DCMA rule, in report order")
    broken_rows: list[RowNote] = Field(description="Rows that couldn't be used")
    notes: list[RowNote] = Field(description="Rows that ended early and were read with blanks")
    summary: list[str] = Field(description="Short points; every number in them is filled in by code")
    summary_author: str = Field(description="Gemini, or code and why")
