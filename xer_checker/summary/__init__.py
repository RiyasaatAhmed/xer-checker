"""Write a short summary of one file's check results: Gemini picks the words, code fills in every number.

How it stops the AI from inventing a figure:
  1. facts.py computes the facts and hands them over by name, like {"missing_links": "20"}.
  2. Gemini replies in a fixed JSON shape: each point says which check it's about, then points
     at facts, like "{missing_links} activities have no link ...". It never types a number itself.
  3. rules.py checks every point. If one breaks a rule, Gemini gets one more try and is told
     exactly what was wrong.
  4. Code swaps each {fact} for its value, so every figure in the summary comes from code.
If a setting is missing, the call fails, or both tries break a rule, code writes the summary from
the same facts instead, and says why. The checker never depends on the AI.

Gemini only sees the facts: no activity names and nothing else from the file, so text inside
a schedule can't give it instructions.

One job per module:
  settings.py  read the Gemini settings from .env, and check them
  rules.py     the rules a reply must pass, and filling in the facts
  gemini.py    the call to Gemini: the request, the reply's shape, time limit and retries
  writer.py    summarize(): ask Gemini, check, retry once, or let code write it
  prompt.md    Gemini's instructions
"""

from .writer import summarize

__all__ = ["summarize"]
