"""The API. Each feature is a folder in modules/ with its own route, schema and service.

Run it from backend/:
  uvicorn main:app --reload     then open http://localhost:8000/docs
"""

from fastapi import FastAPI

from modules.check.route import router as check_router

app = FastAPI(title="XER checker", description="Checks Primavera P6 .xer files against DCMA rules.")


@app.get("/", tags=["Health"])
def health_check():
    """Answers when the API is up."""
    return {"status": "ok"}


app.include_router(check_router)
