"""Read a P6 date. Shared by the checks and the schedule reader."""

from datetime import datetime

# ---------- Constants ----------

DATE_FORMATS = ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y")  # P6 export styles


def date(text):
    """A P6 date or date-time, or None when blank or in a style not listed in DATE_FORMATS."""
    for style in DATE_FORMATS:
        try:
            return datetime.strptime((text or "").strip(), style)
        except ValueError:
            continue
    return None
