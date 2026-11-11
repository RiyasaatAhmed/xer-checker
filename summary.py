"""Write a short summary of one file's check results. Code fills in every number.

checker.py computes the facts and hands them over by name, like {"missing_links": "20"}.
fill() swaps each {fact} in the template below for its value, so every figure comes from code.
"""

import re  # finds the {facts} in a sentence

# ---------- Constants ----------

FACT = re.compile(r"\{(\w+)\}")  # a fact name in braces, like {missing_links}

# The summary, as a template. fill() puts in the numbers from the facts.
CODE_SUMMARY = [
    "Checked {checked} unfinished work activities; broken rows: {broken_rows}.",
    "Missing links: {missing_links} ({missing_links_pct}), {missing_links_vs_limit}.",
    "Negative float: {negative_float} ({negative_float_pct}), {negative_float_vs_limit}.",
    "High float, over {high_float_days} working days: {high_float} ({high_float_pct}), {high_float_vs_limit}.",
]


# ---------- The summary ----------

def summarize(facts):
    """Return (summary, who wrote it). Every figure in the summary comes from `facts`."""
    return fill(CODE_SUMMARY, facts), "code"


def fill(sentences, facts):
    """Swap each {fact} for its value from code, and join the sentences into one paragraph."""
    return " ".join(FACT.sub(lambda match: facts[match.group(1)], s.strip()) for s in sentences)
