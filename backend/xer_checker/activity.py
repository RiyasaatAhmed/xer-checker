"""What a rule sees about one activity. checks.py builds it; each file in rules/ reads it."""

from dataclasses import dataclass  # a small record with named fields


@dataclass(frozen=True)
class Activity:
    """One unfinished work activity, ready for the rules."""
    code: str  # its activity ID in P6 (task_code), like "ContractNo_C470"
    has_predecessor: bool  # a link before it
    has_successor: bool  # a link after it
    float_days: float | None  # total float in working days; None when blank or not a number
    has_lead: bool = False  # a link into it with a negative lag
    has_lag: bool = False  # a link into it with a positive lag
    has_odd_link: bool = False  # a link into it that is not finish to start
    has_duplicate_link: bool = False  # the file links a pair of activities twice, into this one
    out_of_sequence: bool = False  # in progress while a finish to start predecessor is not finished
    duration_days: float | None = None  # remaining duration in working days; None when blank
    original_days: float | None = None  # original duration in working days, the nearest the file has to a baseline; None when blank
    constraint_type: str = ""  # cstr_type, blank when none
    secondary_constraint_type: str = ""  # cstr_type2: P6 allows a second constraint, which can be hard too
    invalid_date: bool = False  # an actual date after the data date, or a forecast start or finish before it
    has_resource: bool = False  # at least one resource is assigned
    in_loop: bool = False  # on a circular chain of links
    open_start: bool = False  # it has predecessors, but none drives its start (no finish to start or start to start)
    open_finish: bool = False  # it has successors, but its finish drives none (no finish to start or finish to finish)
    longest_lag_days: float | None = None  # the largest lead or lag on a link into it, in working days; None with no link
    calendar_missing: bool = False  # its calendar isn't in the file, so its days are counted at 8 hours
    status_conflict: bool = False  # its status disagrees with its actual dates or its remaining duration
