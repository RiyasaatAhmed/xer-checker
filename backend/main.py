"""The API. Each feature is a folder in modules/ with its own route, schema, service and model.

Run it from backend/:
  uvicorn main:app --reload     then open http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from database.db import init_db
from modules.uploads.route import router as uploads_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create any missing table when the API starts."""
    init_db()
    yield


app = FastAPI(title="XER checker", description="Checks Primavera P6 .xer files against DCMA rules.",
              lifespan=lifespan)


@app.get("/", tags=["Health"])
def health_check():
    """Answers when the API is up."""
    return {"status": "ok"}


app.include_router(uploads_router)
