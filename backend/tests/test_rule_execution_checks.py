"""Missed tasks, the critical path test, CPLI and BEI can't run yet: they need a baseline or a delay test."""

import pytest

from xer_checker.activity import Activity
from xer_checker.rules import bei, cpli, critical_path_test, missed_tasks

ANY = Activity("A1", has_predecessor=True, has_successor=True, float_days=0)


@pytest.mark.parametrize("rule", [missed_tasks, critical_path_test, cpli, bei])
def test_the_check_names_what_it_needs_and_never_fails_an_activity(rule):
    assert rule.NEEDS in ("baseline", "delay test")
    assert not rule.fails(ANY)
    assert rule.GROUP == "Execution"


@pytest.mark.parametrize("rule", [cpli, bei])
def test_an_index_is_flagged_below_its_limit(rule):
    assert (rule.MEASURE, rule.DIRECTION, rule.LIMIT) == ("index", "below", 0.95)
