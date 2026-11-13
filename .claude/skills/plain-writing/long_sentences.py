"""List every sentence over the word limit in a Markdown or text file.

Usage: python3 long_sentences.py FILE [FILE ...]
Prints nothing and exits 0 when every sentence fits. Code blocks and table borders are skipped.
"""

import re
import sys
from pathlib import Path

# ---------- Constants ----------

MAX_WORDS = 25  # the hard limit from SKILL.md, step 3
CODE_FENCE = "```"  # opens and closes a code block
NEW_BLOCK = re.compile(r"^\s*(#|[-*+] |\d+\. |>|\||$)")  # a heading, list item, quote, table row or blank line
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")  # a sentence ends at . ! or ? before a space
LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")  # [text](url): only the text counts
MARKUP = re.compile(r"[*_`#>]|\[!\w+\]")  # bold, code ticks, headings, quotes, callout labels
WORD = re.compile(r"[A-Za-z0-9][\w'%.-]*")  # a word, or a number like 15.0%
TABLE_BORDER = re.compile(r"^\|?[\s|:-]+\|?$")  # the |---|---| line under a table header
SHOWN = 90  # characters of a long sentence shown


def blocks(text):
    """(first line number, text) for each paragraph, list item or table cell. Wrapped lines are joined."""
    start, lines, in_code = 0, [], False
    for number, line in enumerate(text.splitlines(), 1):
        if line.strip().startswith(CODE_FENCE):
            in_code = not in_code
            continue
        if in_code or TABLE_BORDER.match(line.strip()):
            continue
        if NEW_BLOCK.match(line) or not lines:  # this line starts a new block
            if lines:
                yield start, " ".join(lines)
            start, lines = number, []
        if line.lstrip().startswith("|"):  # each table cell is its own text
            yield from ((number, cell) for cell in line.split("|"))
        elif line.strip():
            lines.append(line.strip())
    if lines:
        yield start, " ".join(lines)


def long_sentences(path):
    """(line number, word count, start of sentence) for each sentence over MAX_WORDS."""
    found = []
    for number, block in blocks(Path(path).read_text(encoding="utf-8")):
        plain = MARKUP.sub("", LINK.sub(r"\1", block)).strip()
        for sentence in SENTENCE_END.split(plain):
            words = len(WORD.findall(sentence))
            if words > MAX_WORDS:
                found.append((number, words, sentence[:SHOWN]))
    return found


def main(paths):
    total = 0
    for path in paths:
        for number, words, start in long_sentences(path):
            print(f"{path}:{number}: {words} words: {start}")
            total += 1
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
