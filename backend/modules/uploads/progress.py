"""How far each upload has got, for the progress bar in the browser.

The browser names its upload with an ID in the X-Progress-Id header, then asks GET /api/uploads/progress/{id}.
It is kept in memory: the backend runs as one process. An ID is forgotten 10 minutes after its last stage.
"""

import re  # checks an ID before it is kept
import threading  # the upload and the browser's questions run in different threads
import time  # when each ID was last told a stage

# ---------- Constants ----------

STAGES = {  # stage -> (percent done, what the page says). The browser's own sending covers 1 to 40%
    "received": (45, "Reading the file"),
    "read": (60, "Running the checks"),
    "checked": (75, "Writing the summary"),
    "summarized": (90, "Saving"),
    "saved": (100, "Done"),
    "failed": (100, "Can't be checked"),
}
KEEP_SECONDS = 600  # how long an ID is remembered after its last stage
VALID_ID = re.compile(r"[A-Za-z0-9-]{8,64}")  # a UUID fits; anything else is ignored

_lock = threading.Lock()
_progress = {}  # {ID: (stage, when it was told)}


def report(progress_id, stage):
    """Remember that the upload named progress_id has reached stage. An empty or odd ID is ignored."""
    if not progress_id or not VALID_ID.fullmatch(progress_id) or stage not in STAGES:
        return
    now = time.monotonic()
    with _lock:
        for old in [k for k, (_, at) in _progress.items() if now - at > KEEP_SECONDS]:  # forget finished uploads
            del _progress[old]
        _progress[progress_id] = (stage, now)


def progress_of(progress_id):
    """{"percent": 60, "stage": "Running the checks"} for a known ID, else None."""
    with _lock:
        found = _progress.get(progress_id)
    if found is None:
        return None
    percent, words = STAGES[found[0]]
    return {"percent": percent, "stage": words}
