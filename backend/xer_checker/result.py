"""What the checker found in one file. The report and the chart both read from this."""

from dataclasses import dataclass, field  # a small record with named fields


@dataclass(frozen=True)
class FileResult:
    """One checked file's results."""
    name: str  # the file's name
    checked: int  # unfinished work activities checked
    failures: dict  # {check name: [failing activity codes]}
    broken: list  # [(line number, problem), ...] rows that couldn't be used
    notes: list  # [(line number, note), ...] rows that ended early and were read with blanks
    points: list  # the summary: one short sentence per point
    author: str  # who wrote the summary: Gemini, or code (and why)
    facts: dict = field(default_factory=dict)  # the named numbers the summary was written from
    schedule: object = None  # schedule.Schedule: projects, activities and links, for the API to save
