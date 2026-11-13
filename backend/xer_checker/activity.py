"""What a rule sees about one activity. checks.py builds it; each file in rules/ reads it."""

from dataclasses import dataclass  # a small record with named fields


@dataclass(frozen=True)
class Activity:
    """One unfinished work activity, ready for the rules."""
    code: str  # its activity ID in P6 (task_code), like "ContractNo_C470"
    has_predecessor: bool  # a link before it
    has_successor: bool  # a link after it
    float_days: float | None  # total float in working days; None when blank or not a number
