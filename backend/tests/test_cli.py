"""The command line (xer_checker/cli.py): what it prints, and its exit code."""

from helpers import GOOD, ROOT, save

from xer_checker import cli


def run_checker(capsys, *paths):
    """Run `python checker.py <paths>`. Returns (exit code, what it printed)."""
    exit_code = cli.main([str(path) for path in paths])
    return exit_code, capsys.readouterr().out


def test_file_that_cant_be_checked_says_why_and_exits_with_1(tmp_path, capsys):
    exit_code, out = run_checker(capsys, tmp_path / "missing.xer")
    assert exit_code == 1
    assert "missing.xer: can't be checked: can't open the file (no such file or directory)" in out


def test_nothing_to_check_shows_na_not_pass(tmp_path, capsys):
    exit_code, out = run_checker(capsys, save(tmp_path, GOOD.replace("TK_NotStart", "TK_Complete")))
    assert exit_code == 0
    assert "Nothing to check" in out and "n/a" in out and "pass" not in out


def test_one_bad_file_doesnt_stop_the_others(tmp_path, capsys):
    exit_code, out = run_checker(capsys, tmp_path / "missing.xer", save(tmp_path, GOOD))
    assert exit_code == 1
    assert "missing.xer: can't be checked" in out and "test.xer: 1 activities checked" in out


def test_real_file_prints_the_numbers_in_the_readme(capsys):
    exit_code, out = run_checker(capsys, ROOT / "data" / "CSTv2.4.xer")
    assert exit_code == 0
    assert "CSTv2.4.xer: 133 activities checked" in out
    assert "Missing links     20   15.0%  FLAG (limit 5%)" in out
    assert "Negative float     0    0.0%  pass (limit 0%)" in out
    assert "High float        78   58.6%  FLAG (limit 5%)" in out
    assert "    • Missing links: 20 of 133 activities (15.0%), over DCMA's 5% limit." in out
