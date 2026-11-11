"""Read a Primavera P6 schedule file (.xer) into tables, and list the rows that break the format."""

import csv  # splits each line into values
import io  # lets csv read from a string in memory

# ---------- Constants ----------

# Reading the file
ENCODINGS = ("utf-8", "cp1252")  # try in order; P6 writes Windows-1252 (cp1252) by default
MAX_FIELD_SIZE = 10_000_000  # csv's default cap is 131,072 chars; P6 calendar values can be longer
DELIMITER = "\t"  # XER values are separated by tabs
MAX_TEXT_SHOWN = 30  # characters of a bad line shown in its message

# XER record markers: the first value on each line says what the line is
EXPORT_HEADER = "ERMHDR"  # line 1: who exported the file, and when
TABLE_START = "%T"  # a new table starts; the next value is its name
COLUMN_NAMES = "%F"  # the current table's column names
DATA_ROW = "%R"  # one row of data in the current table
END_OF_FILE = "%E"  # last line of a complete file


# ---------- 1. Read the file ----------

def read_xer(path):
    """Parse an .xer file.

    Returns (tables, broken):
      tables  {table name: [row dict, ...]}, each row maps column -> value, plus "_line"
      broken  [(line number, problem), ...] for rows that break the format
    """
    # Turn the file's bytes into text: UTF-8 if valid, otherwise Windows-1252.
    raw = path.read_bytes()
    try:
        text = raw.decode(ENCODINGS[0])
    except UnicodeDecodeError:
        text = raw.decode(ENCODINGS[1], errors="replace")

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
            table, columns = values[1], None  # remember the new table's name
            tables[table] = []  # and give it an empty list of rows
        elif kind == COLUMN_NAMES:
            columns = values[1:]  # remember this table's column names
        elif kind == DATA_ROW:
            if columns is None:  # a row with no column names before it
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
    return tables, broken
