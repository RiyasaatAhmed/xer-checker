"""Upload a .xer file and get its results, list saved uploads, open one again, or delete one.

  route.py     the endpoints under /api/uploads: read the request, turn errors into HTTP answers
  schema.py    the shape of each answer
  service.py   run the checker on the file, save the results, and read them back
  model.py     the tables
  snapshot.py  save the schedule rows, and read them back
  insights.py  where one fix helps most, and the last earlier upload of the same file
"""
