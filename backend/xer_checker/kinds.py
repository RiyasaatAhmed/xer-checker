"""How the activities behind one check are told apart: each check names its own kinds.

A kind is a label and a color tone (a CSS class suffix, t-<tone>). The list view groups and
filters by kind. A check with no kinds of its own has one: "Flagged".
"""

# ---------- Constants ----------

# {rule ID: [(key, label, tone), ...]} in the order the legend shows them
KINDS = {
    "missing-links": [("both", "Nothing before or after", "red"), ("before", "Nothing before", "amber"),
                      ("after", "Nothing after", "violet")],
    "negative-float": [("late1", "Up to 5 days late", "r1"), ("late2", "5 to 20 days late", "r2"),
                       ("late3", "Over 20 days late", "r3")],
    "high-float": [("hf1", "45 to 90 days", "s1"), ("hf2", "Over 90 days", "s3")],
}
DEFAULT = [("all", "Flagged", "s2")]
LATE_STEPS = (5, 20)  # days of negative float that split the kinds of negative float
HIGH_STEP = 90  # days of float that split the kinds of high float, as the float picture's bands do


def kinds_of(rule_id):
    """[{key, label, tone}] for one check."""
    return [{"key": k, "label": label, "tone": tone} for k, label, tone in KINDS.get(rule_id, DEFAULT)]


def kind_of(rule_id, predecessors, successors, float_days):
    """The key of the kind one flagged activity belongs to."""
    if rule_id == "missing-links":
        return "both" if predecessors == 0 and successors == 0 else "before" if predecessors == 0 else "after"
    days = float_days if float_days is not None else 0
    if rule_id == "negative-float":
        late = -days
        return "late1" if late <= LATE_STEPS[0] else "late2" if late <= LATE_STEPS[1] else "late3"
    if rule_id == "high-float":
        return "hf1" if days <= HIGH_STEP else "hf2"
    return DEFAULT[0][0]
