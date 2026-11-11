"""Broken files get a clear answer, never a crash. Each test writes a small file, then reads it.

Run: pytest
"""

import sys
from pathlib import Path

import pytest

import checker
from reader import FileError, read_xer

HERE = Path(__file__).parent

# The smallest file the checks can run on: one unfinished activity.
GOOD = ("ERMHDR\t23.12\n%T\tTASK\n"
        "%F\ttask_id\ttask_code\tstatus_code\ttask_type\ttotal_float_hr_cnt\tclndr_id\n"
        "%R\t1\tA1000\tTK_NotStart\tTT_Task\t0\t1\n%E\n")


def save(tmp_path, text, encoding="utf-8"):
    """Write `text` to a .xer file in a temporary folder, and return its path."""
    path = tmp_path / "test.xer"
    path.write_bytes(text.encode(encoding))
    return path


def reason(path):
    """The plain-words reason a file can't be checked."""
    with pytest.raises(FileError) as caught:
        read_xer(path)
    return str(caught.value)


# ---------- A file that can't be checked says why ----------

def test_missing_file(tmp_path):
    assert reason(tmp_path / "missing.xer") == "can't open the file (no such file or directory)"


def test_empty_file(tmp_path):
    assert reason(save(tmp_path, "")) == "the file is empty"


def test_xml_export(tmp_path):
    assert reason(save(tmp_path, '<?xml version="1.0"?>\n<APIBusinessObjects/>\n')).startswith("it's an XML file")


def test_file_that_is_not_an_xer_export(tmp_path):
    assert reason(save(tmp_path, "%PDF-1.7\n...")) == (
        "it isn't a P6 XER export: line 1 should start with ERMHDR, not '%PDF-1.7'")


def test_rows_before_any_table(tmp_path):
    assert reason(save(tmp_path, "ERMHDR\t23.12\n%F\ttask_id\ttask_code\n%R\t1\tA1\n%E\n")) == (
        "it has no TASK table, so there are no activities to check; "
        "the first broken row is line 2: column names with no table above them")


def test_table_line_without_a_name(tmp_path):
    assert reason(save(tmp_path, "ERMHDR\t23.12\n%T\n%F\ta\n%R\t1\n%E\n")).endswith(
        "the first broken row is line 2: %T line has no table name")


def test_task_table_missing_a_column(tmp_path):
    text = GOOD.replace("\tstatus_code", "").replace("\tTK_NotStart", "")
    assert reason(save(tmp_path, text)) == "its TASK table has no status_code column, which the checks need"


def test_no_activity_could_be_read(tmp_path):
    text = GOOD.replace("\t0\t1\n%E", "\t0\n%E")  # the only activity is one value short
    assert reason(save(tmp_path, text)) == (
        "none of its activities could be read; the first broken row is line 4: TASK row has 5 values, expected 6")


# ---------- A file that can be read, is ----------

def test_byte_order_mark_is_not_a_broken_row(tmp_path):
    tables, broken = read_xer(save(tmp_path, "﻿" + GOOD))
    assert broken == [] and len(tables["TASK"]) == 1


def test_file_resaved_as_utf16_is_read(tmp_path):
    tables, broken = read_xer(save(tmp_path, GOOD, encoding="utf-16"))
    assert broken == [] and len(tables["TASK"]) == 1


def test_damaged_example_is_still_checked_with_its_10_broken_rows():
    tables, broken = read_xer(HERE / "broken_test.xer")
    checker.check(tables, broken)  # adds the bad links and the float typed as text
    assert len(broken) == 10


# ---------- What the command line says ----------

def run_checker(monkeypatch, capsys, path):
    """Run `python checker.py <path>`. Returns (exit code, what it printed)."""
    monkeypatch.setattr(sys, "argv", ["checker.py", str(path)])
    exit_code = checker.main()
    return exit_code, capsys.readouterr().out


def test_file_that_cant_be_checked_says_why_and_exits_with_1(tmp_path, monkeypatch, capsys):
    exit_code, out = run_checker(monkeypatch, capsys, tmp_path / "missing.xer")
    assert exit_code == 1
    assert "missing.xer: can't be checked: can't open the file (no such file or directory)" in out


def test_nothing_to_check_shows_na_not_pass(tmp_path, monkeypatch, capsys):
    exit_code, out = run_checker(monkeypatch, capsys, save(tmp_path, GOOD.replace("TK_NotStart", "TK_Complete")))
    assert exit_code == 0
    assert "Nothing to check" in out and "n/a" in out and "pass" not in out
