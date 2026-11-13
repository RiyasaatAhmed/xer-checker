"""The schedule overview (xer_checker/overview.py), checked against Kazinex's reports and our own checks.

Kazinex's figures (results-from-kazinex/, Logic and Constraint sheets) give every link and constraint share below.
"""

import pytest
from helpers import ROOT

from xer_checker.checks import check
from xer_checker.overview import overview
from xer_checker.reader import read_xer
from xer_checker.schedule import read_schedule


def overview_of(name):
    tables, _, _ = read_xer(ROOT / "data" / name)
    s = read_schedule(tables)
    return overview(s.activities, [l for l in s.links if l.line in s.counted], s.duplicate_links), tables


def share(part_list, key):
    return next((p for p in part_list if p["key"] == key), {"count": 0})["count"]


# file: (links, FS %, leads %, lags %, SF links, constrained %), as Kazinex reports them
KAZINEX = {
    "CSTv2.4.xer": (194, 85.56701030927834, 0, 0.5154639175257731, 1, 3.4482758620689653),
    "example_xer_file.xer": (551, 81.85117967332124, 3.2667876588021776, 5.263157894736842, 0, 0.45977011494252873),
}


@pytest.mark.parametrize("name", list(KAZINEX))
def test_links_and_constraints_match_kazinex(name):
    o, _ = overview_of(name)
    links, fs, leads, lags, sf, constrained = KAZINEX[name]
    assert o["links"] == links
    assert 100 * share(o["by_link_type"], "PR_FS") / links == pytest.approx(fs)
    assert 100 * o["leads"] / links == pytest.approx(leads)
    assert 100 * o["lags"] / links == pytest.approx(lags)
    assert share(o["by_link_type"], "PR_SF") == sf
    assert 100 * o["constraints"] / o["activities"] == pytest.approx(constrained)


@pytest.mark.parametrize("name", list(KAZINEX))
def test_float_profile_agrees_with_the_checks(name):
    o, tables = overview_of(name)
    checked, failures, _ = check(tables)
    bands = {b["key"]: b["count"] for b in o["float_profile"]}
    assert o["checked"] == checked == sum(bands.values()) + o["no_float"]
    assert (bands["negative"], bands["high"]) == (len(failures["Negative float"]), len(failures["High float"]))


def test_activities_by_status_and_type():
    o, _ = overview_of("example_xer_file.xer")
    assert [(p["label"], p["count"]) for p in o["by_status"]] == [("Not started", 385), ("In progress", 29), ("Complete", 21)]
    assert [(p["label"], p["count"]) for p in o["by_type"]] == [
        ("Task", 384), ("Start milestone", 2), ("Finish milestone", 39), ("WBS summary", 10)]
    assert sum(p["count"] for p in o["by_type"]) == o["activities"] == 435
