"""Check Primavera P6 schedule files (.xer). One job per module:

  reader.py   read a .xer file into tables; say why a broken one can't be checked
  checks.py   the three DCMA checks: missing links, negative float, high float
  facts.py    turn the results into the named numbers a summary may use
  summary/    word the summary: code fills in every number, Gemini only picks the words
  report.py   print one file's results
  chart.py    draw the chart, with the summaries under it
  cli.py      run those steps for each file: read, check, summarize, report, chart
"""
