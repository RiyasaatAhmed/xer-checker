"""Checking an uploaded file (modules/uploads/service.py): the same numbers as the command line."""

import pytest
from helpers import ROOT

from modules.uploads.service import check_upload
from xer_checker.reader import FileError


def test_real_file_gives_the_readme_numbers():
    result = check_upload("CSTv2.4.xer", (ROOT / "data" / "CSTv2.4.xer").read_bytes())
    assert (result.file_name, result.checked, result.broken_rows) == ("CSTv2.4.xer", 133, [])
    assert [(r.name, r.count, r.percent, r.status) for r in result.rules] == [
        ("Missing links", 20, 15.0, "flag"), ("Negative float", 0, 0.0, "pass"), ("High float", 78, 58.6, "flag")]
    assert [r.dcma_section for r in result.rules] == ["4.1", "4.7", "4.6"]
    assert result.summary_author.startswith("code")  # the tests never call Gemini


def test_broken_rows_and_notes_have_their_line_numbers():
    result = check_upload("broken_test.xer", (ROOT / "broken_test.xer").read_bytes())
    assert len(result.broken_rows) == 7
    lines = [row.line for row in result.broken_rows]
    assert lines == sorted(lines) and lines[0] == 12  # in line order, like the report
    assert [note.line for note in result.notes] == [17]


def test_folders_in_the_file_name_are_dropped():
    result = check_upload("../../CSTv2.4.xer", (ROOT / "data" / "CSTv2.4.xer").read_bytes())
    assert result.file_name == "CSTv2.4.xer"


def test_a_file_that_cant_be_checked_says_why():
    with pytest.raises(FileError, match="the file is empty"):
        check_upload("empty.xer", b"")
