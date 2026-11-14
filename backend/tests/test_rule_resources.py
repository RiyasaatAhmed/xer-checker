"""The resources rule (xer_checker/rules/resources.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import resources


def lasting(days, has_resource):
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, duration_days=days, has_resource=has_resource)


def test_fails_when_work_of_a_day_has_no_resource():
    assert resources.fails(lasting(1, False))


def test_passes_with_a_resource_or_under_a_day_or_a_blank_duration():
    assert not resources.fails(lasting(1, True))
    assert not resources.fails(lasting(0.5, False))
    assert not resources.fails(lasting(None, False))


def test_needs_resource_assignments_in_the_file():
    assert resources.NEEDS == "resources"
