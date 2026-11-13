"""The upload endpoints (modules/uploads/route.py): status codes and answers."""

import uuid

from helpers import ROOT

from modules.uploads import route

CST = (ROOT / "data" / "CSTv2.4.xer").read_bytes()


def upload(client, name, content):
    """POST one file to /api/uploads."""
    return client.post("/api/uploads", files={"file": (name, content)})


def test_upload_gives_the_results(client):
    response = upload(client, "CSTv2.4.xer", CST)
    assert response.status_code == 200
    body = response.json()
    assert body["checked"] == 133 and [r["count"] for r in body["rules"]] == [20, 0, 78]


def test_an_upload_can_be_opened_again_by_its_id(client):
    saved = upload(client, "CSTv2.4.xer", CST).json()
    response = client.get(f"/api/uploads/{saved['upload_id']}")
    assert response.status_code == 200 and response.json() == saved


def test_the_list_holds_each_upload(client):
    upload(client, "CSTv2.4.xer", CST)
    upload(client, "empty.xer", b"")
    files = [(u["file_name"], u["status"]) for u in client.get("/api/uploads").json()]
    assert sorted(files) == [("CSTv2.4.xer", "ready"), ("empty.xer", "failed")]


def test_an_unknown_id_gets_404(client):
    assert client.get(f"/api/uploads/{uuid.uuid4()}").status_code == 404
    assert client.get("/api/uploads/not-an-id").status_code == 422


def test_a_file_that_cant_be_checked_gets_422_with_the_reason(client):
    response = upload(client, "empty.xer", b"")
    assert response.status_code == 422 and response.json() == {"detail": "can't be checked: the file is empty"}


def test_a_file_over_the_limit_gets_413(client, monkeypatch):
    monkeypatch.setattr(route, "MAX_UPLOAD_BYTES", 10)
    assert upload(client, "big.xer", b"x" * 11).status_code == 413


def test_no_file_gets_422(client):
    assert client.post("/api/uploads").status_code == 422
