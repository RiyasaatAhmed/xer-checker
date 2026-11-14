"""The WBS roll-up (xer_checker/structure.py), on a small tree and on the real files."""

from datetime import datetime
from types import SimpleNamespace as N

from helpers import ROOT

from xer_checker.checks import check
from xer_checker.reader import read_xer
from xer_checker.schedule import read_schedule
from xer_checker.structure import structure


def act(code, wbs, checked=True, start=None, finish=None, status="TK_NotStart"):
    return N(code=code, p6_wbs_id=wbs, checked=checked, start=start, finish=finish, status=status)


NODES = [N(p6_id="r", parent_id=None, name="Project", seq=1), N(p6_id="a", parent_id="r", name="A", seq=2),
         N(p6_id="b", parent_id="r", name="B", seq=1), N(p6_id="e", parent_id="r", name="Empty", seq=3),
         N(p6_id="a1", parent_id="a", name="A1", seq=1)]


def test_numbers_roll_up_to_the_groups_that_hold_them():
    activities = [act("x", "a1", start=datetime(2026, 1, 1), finish=datetime(2026, 2, 1)),
                  act("y", "a", start=datetime(2026, 3, 1), finish=datetime(2026, 4, 1)),
                  act("m", "a", checked=False), act("z", "b")]
    rows = {g["name"]: g for g in structure(NODES, activities, {"x": {0, 2}, "z": {1}}, 3)}
    assert (rows["A"]["checked"], rows["A"]["flagged"], rows["A"]["by_rule"]) == (2, 1, [1, 0, 1])  # the milestone isn't checked
    assert (rows["A"]["start"], rows["A"]["finish"]) == (datetime(2026, 1, 1), datetime(2026, 4, 1))
    assert (rows["Project"]["checked"], rows["Project"]["flagged"], rows["Project"]["by_rule"]) == (3, 2, [1, 1, 1])


def test_groups_come_in_tree_order_and_empty_groups_are_left_out():
    rows = structure(NODES, [act("x", "a1"), act("z", "b")], {}, 3)
    assert [(g["name"], g["depth"]) for g in rows] == [("Project", 0), ("B", 1), ("A", 1), ("A1", 2)]  # siblings by seq; no "Empty"


def test_the_root_adds_up_to_the_checks_on_both_real_files():
    for name in ("CSTv2.4.xer", "example_xer_file.xer"):
        tables, _, _ = read_xer(ROOT / "data" / name)
        checked, failures, _ = check(tables)
        schedule = read_schedule(tables)
        flags = {}
        for number, codes in enumerate(failures.values()):
            for code in codes:
                flags.setdefault(code, set()).add(number)
        [root, *_] = structure(schedule.wbs_nodes, schedule.activities, flags, len(failures))
        assert (root["checked"], root["flagged"]) == (checked, len(flags))
        assert root["by_rule"] == [len(codes) for codes in failures.values()]


def test_heat_and_check_groups_count_flagged_work_by_month_and_set():
    from xer_checker.structure import month_axis
    acts = [act("p1", "a", start=datetime(2026, 6, 10), finish=datetime(2026, 6, 20), status="TK_Complete"),
            act("p2", "a", start=datetime(2026, 7, 2), finish=datetime(2026, 7, 9)),
            act("p3", "b", start=datetime(2026, 7, 20), finish=datetime(2026, 7, 30))]
    months = month_axis(acts)
    assert months == ["2026-06", "2026-07"]
    root = structure(NODES, acts, {"p1": {0}, "p2": {0, 1}, "p3": {1}}, 2, ["Logic", "Float"], months)[0]
    assert root["by_group"] == {"Logic": 2, "Float": 2}  # p2 is in both sets but counts once in each
    assert root["heat"] == [[1, 1], [0, 2]]  # rule 0: p1 in June, p2 in July. rule 1: p2 and p3 in July
    assert (root["complete"], root["total"]) == (1, 3)
