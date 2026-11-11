"""Turn one file's results into the named numbers a summary may use. The AI never computes one."""

from .checks import HIGH_FLOAT_DAYS, LIMITS, percent, within_limit


def summary_facts(checked, failures, broken):
    """Every number the summary may use, by name and already formatted, so the AI never computes one."""
    facts = {"checked": str(checked), "broken_rows": str(len(broken)), "high_float_days": str(HIGH_FLOAT_DAYS)}
    for check_name, codes in failures.items():
        key = check_name.lower().replace(" ", "_")  # "Missing links" -> "missing_links"
        pct = percent(len(codes), checked)
        facts[key] = str(len(codes))  # e.g. "20"
        facts[key + "_pct"] = f"{pct:.1f}%"  # e.g. "15.0%", rounded like the report and the chart
        over_or_within = "within" if within_limit(check_name, pct) else "over"  # code judges the limit, not the AI
        facts[key + "_vs_limit"] = f"{over_or_within} DCMA's {LIMITS[check_name]}% limit" if checked else "nothing to check"
    return facts
