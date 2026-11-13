"""The endpoint: upload a .xer file, get its results."""

from fastapi import APIRouter, HTTPException, UploadFile

from modules.uploads import service
from modules.uploads.schema import CheckResult
from xer_checker.reader import FileError

# ---------- Constants ----------

MAX_UPLOAD_MB = 50  # a bigger upload gets 413; our largest real file is 2.2 MB
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


# A plain def, not async: FastAPI runs it in a thread, so a slow Gemini call never blocks other requests.
@router.post("", response_model=CheckResult)
def upload_xer_file(file: UploadFile) -> CheckResult:
    """Check one .xer file. Answers 413 if it's too big, and 422 with the reason if it can't be checked."""
    content = file.file.read(MAX_UPLOAD_BYTES + 1)  # one byte more tells us it's too big
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"the file is over {MAX_UPLOAD_MB} MB")
    try:
        return service.check_upload(file.filename, content)
    except FileError as problem:  # a plain reason, like "the file is empty"
        raise HTTPException(status_code=422, detail=f"can't be checked: {problem}") from problem
