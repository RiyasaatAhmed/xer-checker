"""The endpoints: upload a .xer file and get its results, list recent uploads, open one again."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlmodel import Session

from database.db import get_session
from modules.uploads import service
from modules.uploads.schema import CheckResult, UploadSummary
from xer_checker.reader import FileError

# ---------- Constants ----------

MAX_UPLOAD_MB = 50  # a bigger upload gets 413; our largest real file is 2.2 MB
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
RECENT_UPLOADS = 20  # how many uploads GET /api/uploads lists

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

# The routes are plain def, not async: FastAPI runs them in a thread, so a slow Gemini call
# or database query never blocks other requests.


@router.post("", response_model=CheckResult)
def upload_xer_file(file: UploadFile, session: Session = Depends(get_session)) -> CheckResult:
    """Check one .xer file and save it. Answers 413 if it's too big, 422 with the reason if it can't be checked."""
    content = file.file.read(MAX_UPLOAD_BYTES + 1)  # one byte more tells us it's too big
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"the file is over {MAX_UPLOAD_MB} MB")
    try:
        return service.check_upload(session, file.filename, content)
    except FileError as problem:  # a plain reason, like "the file is empty"
        raise HTTPException(status_code=422, detail=f"can't be checked: {problem}") from problem


@router.get("", response_model=list[UploadSummary])
def list_recent_uploads(session: Session = Depends(get_session)) -> list[UploadSummary]:
    """The newest uploads first, failed ones included."""
    return service.list_uploads(session, RECENT_UPLOADS)


@router.get("/{upload_id}", response_model=CheckResult)
def get_upload(upload_id: uuid.UUID, session: Session = Depends(get_session)) -> CheckResult:
    """One checked upload's results, as saved. Answers 404 if there's no checked upload with this ID."""
    result = service.get_upload(session, upload_id)
    if result is None:
        raise HTTPException(status_code=404, detail="no checked upload with this ID")
    return result
