"""The DCMA rules, one file each. Every rule file has the same 4 parts:

  NAME          the check's name in the report, the chart, the summary and the API
  LIMIT         the most it may catch, in % of the activities checked
  DCMA_SECTION  where the rule is in DCMA-EA PAM 200.1
  fails()       True when one activity breaks the rule

To add a rule: add its file here, then add it to RULES.
"""

from . import high_float, missing_links, negative_float

# ---------- Constants ----------

RULES = (missing_links, negative_float, high_float)  # in the order the report and the chart show them
LIMITS = {rule.NAME: rule.LIMIT for rule in RULES}  # {check name: limit %}
