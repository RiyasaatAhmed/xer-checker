"""Every check has its words in the frontend (frontend/src/rules.ts), as CLAUDE.md asks of a new check."""

import re

from helpers import ROOT

from xer_checker.rules import RULES, rule_id

WORDS = ROOT.parent / "frontend" / "src" / "rules.ts"  # the words around each check's numbers, keyed by its ID


def test_every_check_has_its_words_in_the_frontend():
    keys = set(re.findall(r"^  '?([a-z-]+)'?: \{", WORDS.read_text(), re.M))  # the top-level keys of TEXT
    assert {rule_id(rule) for rule in RULES} - keys == set()
