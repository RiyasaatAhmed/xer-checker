"""The resources rule (xer_checker/rules/resources.py), one activity at a time."""

from xer_checker.activity import Activity
from xer_checker.rules import resources


def lasting(days, has_resource):
    return Activity("A1", has_predecessor=True, has_successor=True, float_days=0, original_days=days, has_resource=has_resource)


def test_fails_when_any_work_has_no_resource():  # DCMA 4.10: durations greater than zero
    assert resources.fails(lasting(1, False))
    assert resources.fails(lasting(0.5, False))


def test_passes_with_a_resource_or_no_duration():
    assert not resources.fails(lasting(1, True))
    assert not resources.fails(lasting(0, False))
    assert not resources.fails(lasting(None, False))


def test_needs_resource_assignments_in_the_file():
    assert resources.NEEDS == "resources"
