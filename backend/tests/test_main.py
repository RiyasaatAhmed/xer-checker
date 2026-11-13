"""The API app (main.py): it starts, and its routes are in place."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check_answers_ok():
    response = client.get("/")
    assert response.status_code == 200 and response.json() == {"status": "ok"}


def test_the_check_route_is_in_place():
    assert "/api/checks" in app.openapi()["paths"]
