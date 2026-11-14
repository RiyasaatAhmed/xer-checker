"""Turn one file's results into the named numbers a summary may use. The AI never computes one."""

import re  # makes a fact name from a check name

from .checks import percent, share_text, within_limit
from .rules import LIMITS, RULES
from .rules.high_float import HIGH_FLOAT_DAYS

# ---------- Constants ----------

MAX_CHECKS = 3  # the summary covers the worst checks only: a short list is read, a long one is skipped
SEVERITY = {rule.NAME: rule.SEVERITY for rule in RULES}  # {check name: 1 to 3}
FROM_DCMA = {rule.NAME: bool(rule.DCMA_SECTION) for rule in RULES}  # {check name: is it a DCMA check}


def fact_key(check_name):
    """A check's name as a fact name: "Link types" -> "link_types"."""
    return re.sub(r"[^a-z0-9]+", "_", check_name.lower()).strip("_")


def worst_checks(checked, failures, skipped=()):
    """The names of the checks the summary covers: the worst over their limit first, then the first within it.

    Worst means the most serious (SEVERITY), then the furthest over the limit. A limit of 0% has no
    ratio, so its share of activities stands in. A check that couldn't run is left out.
    """
    runnable = [name for name in failures if name not in skipped]

    def rank(name):
        pct, limit = percent(len(failures[name]), checked), LIMITS[name]
        return (SEVERITY[name], pct / limit if limit else pct)

    over = sorted((n for n in runnable if checked and not within_limit(n, percent(len(failures[n]), checked))), key=rank, reverse=True)
    rest = [n for n in runnable if n not in over]
    return (over + rest)[:MAX_CHECKS]


def summary_facts(checked, failures, broken, skipped=()):
    """Every number the summary may use, by name and already formatted, so the AI never computes one."""
    facts = {"checked": str(checked), "broken_rows": str(len(broken)), "high_float_days": str(HIGH_FLOAT_DAYS)}
    for check_name in worst_checks(checked, failures, skipped):
        codes = failures[check_name]
        key = fact_key(check_name)  # e.g. "missing_links"
        pct = percent(len(codes), checked)
        facts[key + "_name"] = check_name  # e.g. "Missing links"
        facts[key] = str(len(codes))  # e.g. "20"
        facts[key + "_pct"] = share_text(len(codes), checked)  # e.g. "15.0%", or "<0.1%": rounded like the report and the chart
        over_or_within = "within" if within_limit(check_name, pct) else "over"  # code judges the limit, not the AI
        whose = "DCMA's" if FROM_DCMA[check_name] else "the checker's"  # a check of ours has no DCMA limit
        facts[key + "_vs_limit"] = f"{over_or_within} {whose} {LIMITS[check_name]}% limit" if checked else "nothing to check"
    return facts
