"""The rules a summary must pass before it's used, and filling in the facts.

A reply is a list of points, each {"about": a topic, "text": one sentence with {facts} in it}.
problems() lists every rule a reply breaks; fill() swaps each {fact} for its value from code.
"""

import re  # finds {facts}, digits and amount words in a sentence

# ---------- Constants ----------

# Shape of the summary
MAX_SENTENCES = 4  # points per file: short enough to fit under the chart (the instructions ask for 2 to 4)
MAX_SENTENCE_LENGTH = 250  # characters
MAX_POINT_WORDS = 25  # one point is one short sentence
MORE_THAN_ONE_SENTENCE = re.compile(r"[.!?]\s+\S|;")  # a sentence ends and another starts, or a ";" joins two

# Topics: what a point may be "about", and which facts belong to it
OVERVIEW = "overview"  # a point about the file as a whole
OVERVIEW_FACTS = ("broken_rows",)  # the facts an overview point may use: rows, never activities
SHARED_FACTS = ("checked",)  # a fact any check's point may use: the number the shares are out of
LIMIT_SUFFIX = "_vs_limit"  # each check has a fact ending like this: over or within its limit, in words
OVER = "over"  # how a _vs_limit fact starts when the check is over its limit

# What the AI may not write itself, because a figure has to come from a {fact}
FACT = re.compile(r"\{(\w+)\}")  # a fact name in braces, like {missing_links}
DIGIT = re.compile(r"\d")  # a number typed in digits
NUMBER_WORDS = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
                "fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy "
                "eighty ninety hundred hundreds thousand thousands million half halves third thirds "
                "quarter quarters twice double triple dozen dozens percent")
AMOUNT_WORDS = "all most majority minority none every nearly almost few many several single couple handful"
WORD = re.compile(r"\b(" + "|".join((NUMBER_WORDS + " " + AMOUNT_WORDS).split()) + r")\b", re.IGNORECASE)
OWN_JUDGEMENT = re.compile(r"\b(limits?|thresholds?)\b", re.IGNORECASE)  # only a _vs_limit fact may say this
FILLER = re.compile(r"\b(additionally|furthermore|moreover|meanwhile|overall|notably|importantly|"
                    r"in summary|in conclusion|it'?s worth noting|it is worth noting)\b", re.IGNORECASE)


# ---------- Topics ----------

def check_names(facts):
    """The checks the facts cover, like "missing_links": every fact name that ends in _vs_limit."""
    return [name.removesuffix(LIMIT_SUFFIX) for name in facts if name.endswith(LIMIT_SUFFIX)]


def topics(facts):
    """Everything a point may be about: the overview, or one of the checks."""
    return (OVERVIEW, *check_names(facts))


def belongs(fact, about):
    """May a point about `about` use this fact? Its own check's facts, plus the shared ones."""
    if about == OVERVIEW:
        return fact in OVERVIEW_FACTS
    if fact in SHARED_FACTS:
        return True
    return fact == about or fact.startswith(about + "_")


# ---------- The rules ----------

def problems(sentences, facts):
    """List every rule the reply breaks. An empty list means it's safe to fill in."""
    if not isinstance(sentences, list) or not 1 <= len(sentences) <= MAX_SENTENCES:
        return [f"the reply must have 1 to {MAX_SENTENCES} sentences"]
    issues = []
    for n, item in enumerate(sentences, start=1):
        issues += point_problems(n, item, facts)
    return issues + flags_left_out(sentences, facts)


def point_problems(n, item, facts):
    """The rules point number `n` breaks."""
    if not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip():
        return [f"sentence {n} needs an \"about\" and some \"text\""]
    about, sentence = item.get("about"), item["text"]
    names = FACT.findall(sentence)  # the facts this sentence points at
    own_words = FACT.sub("", sentence)  # everything the AI wrote itself
    return (topic_problems(n, about, names, facts)
            + figure_problems(n, names, own_words, facts)
            + style_problems(n, sentence, own_words))


def topic_problems(n, about, names, facts):
    """Is the point about a real topic, and does it only use that topic's facts?"""
    if about not in topics(facts):
        return [f"sentence {n} is about {about!r}; use one of: {', '.join(topics(facts))}"]
    elsewhere = [name for name in names if name in facts and not belongs(name, about)]
    if elsewhere:  # the right number in the wrong sentence
        return [f"sentence {n} is about {about} but uses {{{elsewhere[0]}}}; give that its own sentence"]
    return []


def figure_problems(n, names, own_words, facts):
    """Does every figure come from a fact that exists? The AI may not type, spell or invent one."""
    issues = []
    if DIGIT.search(own_words):
        issues.append(f"sentence {n} has a number in digits; use a fact in braces instead")
    if word := WORD.search(own_words):
        issues.append(f"sentence {n} says {word.group(0)!r}; use a fact in braces instead")
    if "%" in own_words:
        issues.append(f"sentence {n} has a % sign; the _pct facts already include it")
    if "{" in own_words or "}" in own_words:
        issues.append(f"sentence {n} has a brace that isn't around a fact name")
    bare = [name for name in facts if "_" in name and re.search(rf"\b{name}\b", own_words)]
    if bare:  # a fact name typed as a word: it would show up as "missing_links"
        issues.append(f"sentence {n} writes {bare[0]} without braces; write {{{bare[0]}}}")
    unknown = [name for name in names if name not in facts]
    if unknown:
        issues.append(f"sentence {n} uses a fact that doesn't exist: {unknown[0]}")
    if not names:
        issues.append(f"sentence {n} doesn't use any fact")
    return issues


def style_problems(n, sentence, own_words):
    """Is it one short, direct point? One sentence, one idea, no filler, no judging the limit itself."""
    issues = []
    if len(sentence) > MAX_SENTENCE_LENGTH:
        issues.append(f"sentence {n} is longer than {MAX_SENTENCE_LENGTH} characters")
    if MORE_THAN_ONE_SENTENCE.search(own_words):  # one point, one idea
        issues.append(f"sentence {n} holds more than one sentence; make it one point with one idea")
    if len(sentence.split()) > MAX_POINT_WORDS:
        issues.append(f"sentence {n} has more than {MAX_POINT_WORDS} words; make it shorter")
    if judgement := OWN_JUDGEMENT.search(own_words):
        issues.append(f"sentence {n} says {judgement.group(0)!r} itself; the _vs_limit fact already says it")
    if filler := FILLER.search(own_words):  # words that make a summary sound machine-written
        issues.append(f"sentence {n} says {filler.group(0)!r}; state the finding directly")
    return issues


def flags_left_out(sentences, facts):
    """A check that's over its limit can't be left out of the summary."""
    covered = {item.get("about") for item in sentences if isinstance(item, dict)}
    return [f"no sentence is about {check}, which is over its limit" for check in check_names(facts)
            if facts[check + LIMIT_SUFFIX].startswith(OVER) and check not in covered]


# ---------- Filling in the facts ----------

def fill(sentences, facts):
    """Swap each {fact} for its value from code. Returns the points, one sentence each."""
    return [FACT.sub(lambda match: facts[match.group(1)], s["text"].strip()) for s in sentences]
