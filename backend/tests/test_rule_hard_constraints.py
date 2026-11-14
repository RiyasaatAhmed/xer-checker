"""The hard-constraints rule (xer_checker/rules/hard_constraints.py), one activity at a time."""

import pytest

from xer_checker.activity import Activity
from xer_checker.rules import hard_constraints


def with_constraint(kind):
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, constraint_type=kind)


@pytest.mark.parametrize("kind", ["CS_MSO", "CS_MEO", "CS_MSOB", "CS_MEOB", "CS_MANDSTART", "CS_MANDFIN"])
def test_fails_on_a_hard_constraint(kind):
    assert hard_constraints.fails(with_constraint(kind))


@pytest.mark.parametrize("kind", ["", "CS_MSOA", "CS_MEOA", "CS_ALAP"])
def test_passes_with_a_soft_constraint_or_none(kind):
    assert not hard_constraints.fails(with_constraint(kind))


def test_fails_on_a_hard_second_constraint():  # P6's secondary constraint, cstr_type2
    second = Activity("A1", has_predecessor=True, has_successor=True, float_days=0, constraint_type="CS_MSOA", secondary_constraint_type="CS_MEOB")
    assert hard_constraints.fails(second)
