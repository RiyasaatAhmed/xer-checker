"""How each check names the kinds of its activities (xer_checker/kinds.py)."""

import pytest

from xer_checker.kinds import kind_of, kinds_of


def test_missing_links_tell_which_side_is_missing():
    assert kind_of("missing-links", 0, 0, None) == "both"
    assert kind_of("missing-links", 0, 2, None) == "before"
    assert kind_of("missing-links", 2, 0, None) == "after"


@pytest.mark.parametrize("days, kind", [(-1, "late1"), (-5, "late1"), (-6, "late2"), (-21, "late3")])
def test_negative_float_is_split_by_how_late(days, kind):
    assert kind_of("negative-float", 1, 1, days) == kind


@pytest.mark.parametrize("days, kind", [(50, "hf1"), (90, "hf1"), (91, "hf2"), (136, "hf2")])
def test_high_float_is_split_by_how_much(days, kind):
    assert kind_of("high-float", 1, 1, days) == kind


def test_a_check_with_no_kinds_of_its_own_has_one():
    assert [k["key"] for k in kinds_of("leads")] == ["all"] and kind_of("leads", 1, 1, 0) == "all"


def test_every_kind_a_row_can_have_is_in_the_checks_legend():
    for check_id, days in (("negative-float", -30), ("high-float", 200), ("high-float", 50)):
        assert kind_of(check_id, 1, 1, days) in {k["key"] for k in kinds_of(check_id)}
