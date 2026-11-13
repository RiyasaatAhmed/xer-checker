"""Check Primavera P6 schedule files (.xer).

Usage:
  python checker.py              check every .xer in data/ and save chart.png
  python checker.py FILE.xer     check only the files named (no chart, so chart.png stays as is)

This file only starts the program. The code is in the xer_checker/ folder, one job per file;
xer_checker/__init__.py lists them.
"""

import sys  # sets the exit code

from xer_checker.cli import main

if __name__ == "__main__":  # only when run directly, not when imported
    sys.exit(main())
