"""Read a Primavera P6 schedule file (.xer) into tables, and say clearly what's wrong with a broken one.

Two kinds of problem:
  - A broken row (wrong number of values, a stray line, no end marker) is listed with its line
    number, and the rest of the file is still checked.
  - A file that can't be checked at all (missing, empty, not an XER export, no activities, or a
    column the checks need is missing) raises FileError, with the reason in plain words.
"""

import csv  # splits each line into values
import io  # lets csv read from a string in memory

# ---------- Constants ----------

# Reading the file
UTF16_MARKS = (b"\xff\xfe", b"\xfe\xff")  # how a file re-saved as UTF-16 (say, by a text editor) starts
ENCODINGS = ("utf-8-sig", "cp1252")  # try in order; utf-8-sig drops a byte-order mark; P6 writes Windows-1252
MAX_FIELD_SIZE = 10_000_000  # csv's default cap is 131,072 chars; P6 calendar values can be longer
DELIMITER = "\t"  # XER values are separated by tabs
MAX_TEXT_SHOWN = 30  # characters of a bad line shown in its message

# XER record markers: the first value on each line says what the line is
EXPORT_HEADER = "ERMHDR"  # line 1: who exported the file, and when
TABLE_START = "%T"  # a new table starts; the next value is its name
COLUMN_NAMES = "%F"  # the current table's column names
DATA_ROW = "%R"  # one row of data in the current table
END_OF_FILE = "%E"  # last line of a complete file

# The columns the checks can't run without, per table
REQUIRED_COLUMNS = {
    "TASK": ("task_id", "task_code", "task_type", "status_code", "total_float_hr_cnt", "clndr_id"),
    "TASKPRED": ("task_id", "pred_task_id"),
    "CALENDAR": ("clndr_id",),
}


class FileError(Exception):
    """A file that can't be checked. The message says why, in plain words."""


# ---------- 1. Read the file ----------

def read_xer(path):
    """Parse an .xer file.

    Returns (tables, broken):
      tables  {table name: [row dict, ...]}, each row maps column -> value, plus "_line"
      broken  [(line number, problem), ...] for rows that break the format
    Raises FileError when the file can't be checked at all.
    """
    text = read_text(path)
    tables, broken = {}, []  # the results we return
    table, columns, ended = None, None, False  # memory: current table, its columns, saw %E yet?
    csv.field_size_limit(MAX_FIELD_SIZE)  # allow very long values (P6 calendars)
    # Tab-separated. csv also rejoins quoted values that span several lines.
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=DELIMITER)
    last_line = 0  # last line number csv has read so far
    for values in reader:  # one record (usually one line) at a time
        line, last_line = last_line + 1, reader.line_num  # this record starts on `line`
        if not values:
            continue  # skip blank lines
        kind = values[0]  # the first value says what the line is
        if kind == TABLE_START:
            if len(values) < 2 or not values[1]:  # a %T line with no table name
                broken.append((line, "%T line has no table name"))
                table, columns = None, None  # so its rows are flagged, not added to the table before it
                continue
            table, columns = values[1], None  # remember the new table's name
            tables[table] = []  # and give it an empty list of rows
        elif kind == COLUMN_NAMES:
            if table is None:  # no table to name the columns of
                broken.append((line, "column names with no table above them"))
                continue
            columns = values[1:]  # remember this table's column names
        elif kind == DATA_ROW:
            if table is None:  # no table to put the row in
                broken.append((line, "row with no table above it"))
            elif columns is None:  # a row with no column names before it
                broken.append((line, f"{table} row comes before its column names"))
            elif len(values) - 1 != len(columns):  # wrong number of values (-1 skips "%R")
                broken.append((line, f"{table} row has {len(values) - 1} values, expected {len(columns)}"))
            else:  # a good row: pair each column name with its value
                row = dict(zip(columns, values[1:]))
                row["_line"] = line  # keep the line number for later error messages
                tables[table].append(row)
        elif kind == END_OF_FILE:
            ended = True  # the file is complete
        elif kind != EXPORT_HEADER:  # anything else isn't valid XER
            broken.append((line, f"line doesn't start with %T, %F, %R or %E: {kind[:MAX_TEXT_SHOWN]!r}"))
    if not ended:  # no %E means the file was probably cut off
        broken.append((last_line, "no %E end marker, so the file may be cut off"))
    check_usable(tables, broken)
    return tables, broken


def read_text(path):
    """The file's text. Raises FileError if it can't be opened, is empty, or isn't an XER export."""
    try:
        raw = path.read_bytes()
    except OSError as error:  # missing, a folder, no permission
        raise FileError(f"can't open the file ({(error.strerror or str(error)).lower()})") from None
    if not raw.strip():
        raise FileError("the file is empty")
    if raw.startswith(UTF16_MARKS):  # re-saved as UTF-16: read it as UTF-16
        text = raw.decode("utf-16", errors="replace")
    else:  # UTF-8 if valid, otherwise Windows-1252
        try:
            text = raw.decode(ENCODINGS[0])
        except UnicodeDecodeError:
            text = raw.decode(ENCODINGS[1], errors="replace")
    start = text.lstrip()[:MAX_TEXT_SHOWN]  # how the file begins
    if start.startswith("<"):  # P6 can also export XML
        raise FileError("it's an XML file, not an XER export: export the schedule from P6 as XER")
    if not start.startswith(EXPORT_HEADER):  # every P6 XER export starts with this header line
        raise FileError(f"it isn't a P6 XER export: line 1 should start with {EXPORT_HEADER}, "
                        f"not {start.split()[0]!r}")
    return text


def check_usable(tables, broken):
    """Raise FileError if the checks can't run: no activities, or a column they need is missing."""
    first = min(broken) if broken else None  # the first broken row often explains the rest
    hint = f"; the first broken row is line {first[0]}: {first[1]}" if first else ""
    if "TASK" not in tables:
        raise FileError(f"it has no TASK table, so there are no activities to check{hint}")
    if not tables["TASK"]:
        raise FileError(f"none of its activities could be read{hint}" if broken else "its TASK table is empty")
    for table, needed in REQUIRED_COLUMNS.items():
        rows = tables.get(table, [])
        missing = [column for column in needed if rows and column not in rows[0]]  # rows share their columns
        if missing:
            raise FileError(f"its {table} table has no {missing[0]} column, which the checks need")
