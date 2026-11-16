"""Check Primavera P6 schedule files (.xer). One job per module:

  reader.py        read a .xer file into tables; say why a broken one can't be checked
  checks.py        pick the activities DCMA checks, and run every rule on them
  activity.py      what a rule sees about one activity
  rules/           one file per check: 21 checks in 7 sets
  availability.py  which checks a file can support, and why not when one can't
  kinds.py         how each check names the kinds of its activities
  causes.py        open ends: one missing link that many flagged activities lead only into
  dates.py         read a P6 date
  schedule.py      projects, activities and links, read for the API
  overview.py      what's in the schedule, counted
  structure.py     the WBS tree, with checked and flagged counts rolled up
  facts.py         turn the results into the named numbers a summary may use
  summary/         word the summary: code fills in every number, Gemini only picks the words
  result.py        one file's results
  report.py        print one file's results
  chart.py         draw the chart, with the summaries under it
  cli.py           run those steps for each file: read, check, summarize, report, chart
"""
