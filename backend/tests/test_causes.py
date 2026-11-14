"""Finding the open ends behind a run of flags (xer_checker/causes.py)."""

from xer_checker.causes import lead_only_into, open_ends


def test_a_chain_into_an_open_end_leads_only_into_it():
    links = [("1", "2"), ("2", "3"), ("4", "5"), ("5", "6"), ("6", "7"), ("7", "8")]  # 3 is a dead end; 8 is where work goes
    assert open_ends(set("12345678"), {"1", "2", "3"}, links) == [("3", 3)]


def test_an_activity_that_also_feeds_other_work_is_not_stranded():
    successors = {"1": ["2", "9"], "2": ["3"]}  # 1 also feeds 9, which carries on
    predecessors = {"2": ["1"], "3": ["2"], "9": ["1"]}
    assert lead_only_into("3", successors, predecessors) == {"2", "3"}


def test_the_projects_real_end_is_not_a_gap():
    links = [("1", "2"), ("2", "3"), ("3", "4")]  # every path ends at 4
    assert open_ends({"1", "2", "3", "4"}, {"1", "2", "3", "4"}, links) == []


def test_an_open_end_that_explains_one_flag_is_not_worth_showing():
    assert open_ends({"1", "2", "3", "4", "5", "6"}, {"2"}, [("1", "2"), ("3", "4"), ("4", "5"), ("5", "6")]) == []


def test_most_cleared_comes_first():
    links = [("1", "2"), ("2", "3"), ("4", "5"), ("5", "6"), ("6", "7"), ("8", "9"), ("9", "10")]
    found = open_ends(set("123456789") | {"10", "7"}, set("123456789") | {"10", "7"}, links)
    assert [clears for _, clears in found] == [4, 3, 3]
