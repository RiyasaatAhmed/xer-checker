"""The upload endpoint (modules/check/route.py): status codes and answers."""

from fastapi.testclient import TestClient
from helpers import ROOT

from main import app
from modules.check import route

client = TestClient(app)


def upload(name, content):
    """POST one file to /api/checks."""
    return client.post("/api/checks", files={"file": (name, content)})


def test_upload_gives_the_results():
    response = upload("CSTv2.4.xer", (ROOT / "data" / "CSTv2.4.xer").read_bytes())
    assert response.status_code == 200
    body = response.json()
    assert body["checked"] == 133 and [r["count"] for r in body["rules"]] == [20, 0, 78]


def test_a_file_that_cant_be_checked_gets_422_with_the_reason():
    response = upload("empty.xer", b"")
    assert response.status_code == 422 and response.json() == {"detail": "can't be checked: the file is empty"}


def test_a_file_over_the_limit_gets_413(monkeypatch):
    monkeypatch.setattr(route, "MAX_UPLOAD_BYTES", 10)
    response = upload("big.xer", b"x" * 11)
    assert response.status_code == 413


def test_no_file_gets_422():
    assert client.post("/api/checks").status_code == 422
