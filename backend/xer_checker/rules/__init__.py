"""The checks, one file each. Every rule file has the same parts:

  NAME          the check's name in the report, the chart, the summary and the API
  LIMIT         where it flags: a % of the activities checked, or an index for MEASURE "index"
  DCMA_SECTION  where the rule is in DCMA-EA PAM 200.1; blank for a check that isn't DCMA's
  GROUP         the set it belongs to on the check board
  MEASURE       "percent" (a share of activities), "index" (a ratio) or "test" (pass or fail)
  DIRECTION     "above": flagged above the limit. "below": flagged under it
  SEVERITY      1 to 3: ranks checks over their limit when the limit gives no ratio
  NEEDS         what the file must hold for the check to run (see availability.py), or None
  fails()       True when one activity breaks the rule

To add a rule: add its file here, then add it to RULES.
"""

from . import (bei, cpli, critical_path_test, duplicate_links, hard_constraints, high_float, invalid_dates, lags, leads,
               link_types, long_durations, missed_tasks, missing_links, negative_float, out_of_sequence, resources)

# ---------- Constants ----------

# In the order the report and the check board show them: one set after another.
RULES = (missing_links, leads, lags, link_types, duplicate_links, out_of_sequence,
         hard_constraints,
         negative_float, high_float,
         long_durations,
         invalid_dates,
         resources,
         missed_tasks, critical_path_test, cpli, bei)
LIMITS = {rule.NAME: rule.LIMIT for rule in RULES}  # {check name: limit}
DIRECTIONS = {rule.NAME: rule.DIRECTION for rule in RULES}  # {check name: "above" or "below"}
BY_METRIC = {rule.__name__.rsplit(".", 1)[-1]: rule for rule in RULES}  # {rule file name: rule}


def rule_id(rule):
    """The rule's stable ID: its file name with hyphens, like "missing-links". Words and links use it."""
    return rule.__name__.rsplit(".", 1)[-1].replace("_", "-")
