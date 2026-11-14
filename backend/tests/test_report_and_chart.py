"""The report's verdicts (xer_checker/report.py) and the chart file (xer_checker/chart.py)."""

from xer_checker.chart import chart_checks, draw_chart
from xer_checker.report import verdict
from xer_checker.result import FileResult

PNG_START = b"\x89PNG"  # how every PNG file begins


def result(name, checked, missing_links, points):
    """A file's results, with only missing links failing."""
    failures = {"Missing links": ["A1"] * missing_links, "Negative float": [], "High float": []}
    return FileResult(name, checked, failures, broken=[], notes=[], points=points, author="code")


def test_verdict_is_pass_within_the_limit_and_flag_over_it():
    assert verdict("Missing links", 5.0, checked=100) == "pass"
    assert verdict("Missing links", 5.1, checked=100) == "FLAG"


def test_verdict_is_na_when_nothing_was_checked():  # not a misleading "pass"
    assert verdict("Missing links", 0, checked=0) == "n/a"


def test_chart_is_saved_as_a_png_where_asked(tmp_path):
    path = tmp_path / "chart.png"
    draw_chart([result("a.xer", 10, 2, ["One point."]), result("b.xer", 20, 0, ["A point.", "Another point."])], path)
    assert path.read_bytes().startswith(PNG_START)


def test_chart_handles_a_file_with_nothing_to_check(tmp_path):  # no dividing by zero
    path = tmp_path / "chart.png"
    draw_chart([result("finished.xer", 0, 0, ["Nothing to check."])], path)
    assert path.exists()


def test_chart_draws_the_largest_problems_when_more_than_6_are_over(tmp_path):
    over = {"Missing links": 10, "Leads": 2, "Lags": 6, "Link types": 11, "Duplicate links": 1, "Out-of-sequence work": 1,
            "High float": 50, "Resources": 80}  # 8 checks over their limit, in activities out of 100
    failures = {name: ["A1"] * over.get(name, 0) for name in ("Missing links", "Leads", "Lags", "Link types", "Duplicate links",
                                                               "Out-of-sequence work", "Hard constraints", "Negative float",
                                                               "High float", "Long durations", "Invalid dates", "Resources")}
    shown = chart_checks([FileResult("a.xer", 100, failures, broken=[], notes=[], points=[], author="code")])
    assert shown == ["Missing links", "Leads", "Lags", "Link types", "High float", "Resources"]  # the 2 smallest drop out
