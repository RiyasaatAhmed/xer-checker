"""Write a short summary of one file's check results. Code fills in every number.

checker.py computes the facts and hands them over by name, like {"missing_links": "20"}.
fill() swaps each {fact} in a sentence for its value, so every figure comes from code.

problems() holds the rules an AI-written summary will have to pass before it's used: no number
typed or spelled out, no made-up fact, and no sentence without a fact. The template passes them.
"""

import re  # finds {facts}, digits and amount words in a sentence

# ---------- Constants ----------

# Shape of the summary
MAX_SENTENCES = 4  # short enough to fit under the chart
MAX_SENTENCE_LENGTH = 250  # characters

# What an AI may not write itself, because a figure has to come from a {fact}
FACT = re.compile(r"\{(\w+)\}")  # a fact name in braces, like {missing_links}
DIGIT = re.compile(r"\d")  # a number typed in digits
NUMBER_WORDS = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
                "fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy "
                "eighty ninety hundred hundreds thousand thousands million half halves third thirds "
                "quarter quarters twice double triple dozen dozens percent")
AMOUNT_WORDS = "all most majority minority none every nearly almost few many several single couple handful"
WORD = re.compile(r"\b(" + "|".join((NUMBER_WORDS + " " + AMOUNT_WORDS).split()) + r")\b", re.IGNORECASE)

# The summary code writes. fill() puts in the numbers from the facts.
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


def problems(sentences, facts):
    """List every rule the sentences break. An empty list means they're safe to fill in."""
    if not isinstance(sentences, list) or not 1 <= len(sentences) <= MAX_SENTENCES:
        return [f"the reply must be a list of 1 to {MAX_SENTENCES} sentences"]
    issues = []
    for n, sentence in enumerate(sentences, start=1):
        if not isinstance(sentence, str) or not sentence.strip():
            issues.append(f"sentence {n} is empty or isn't text")
            continue
        names = FACT.findall(sentence)  # the facts this sentence points at
        own_words = FACT.sub("", sentence)  # everything the AI wrote itself
        if DIGIT.search(own_words):
            issues.append(f"sentence {n} has a number in digits; use a fact in braces instead")
        if word := WORD.search(own_words):
            issues.append(f"sentence {n} says {word.group(0)!r}; use a fact in braces instead")
        if "%" in own_words:
            issues.append(f"sentence {n} has a % sign; the _pct facts already include it")
        if "{" in own_words or "}" in own_words:
            issues.append(f"sentence {n} has a brace that isn't around a fact name")
        unknown = [name for name in names if name not in facts]
        if unknown:
            issues.append(f"sentence {n} uses a fact that doesn't exist: {unknown[0]}")
        if not names:
            issues.append(f"sentence {n} doesn't use any fact")
        if len(sentence) > MAX_SENTENCE_LENGTH:
            issues.append(f"sentence {n} is longer than {MAX_SENTENCE_LENGTH} characters")
    return issues


def fill(sentences, facts):
    """Swap each {fact} for its value from code, and join the sentences into one paragraph."""
    return " ".join(FACT.sub(lambda match: facts[match.group(1)], s.strip()) for s in sentences)
