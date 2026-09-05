"""The adapter's whole contract: refuse a bad signature, answer PING, defer and
forward everything else, relay autocomplete inside the wall."""

import json
import os
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from starlette.testclient import TestClient

PRIVATE_KEY = Ed25519PrivateKey.generate()
os.environ["DISCORD_PUBLIC_KEY"] = (
    PRIVATE_KEY.public_key()
    .public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    .hex()
)
os.environ["BACKEND_URL"] = "http://backend.test/discord/interactions"

import app as adapter  # noqa: E402  the module reads its env at import

client = TestClient(adapter.app)


def signed(payload: dict, key: Ed25519PrivateKey = PRIVATE_KEY) -> tuple[bytes, dict]:
    body = json.dumps(payload).encode()
    stamp = str(int(time.time()))
    signature = key.sign(stamp.encode() + body).hex()
    headers = {
        "Content-Type": "application/json",
        "X-Signature-Ed25519": signature,
        "X-Signature-Timestamp": stamp,
    }
    return body, headers


def test_bad_signature_is_refused():
    body, headers = signed({"type": 1}, Ed25519PrivateKey.generate())
    assert (
        client.post("/interactions", content=body, headers=headers).status_code == 401
    )


def test_missing_signature_is_refused():
    assert client.post("/interactions", content=b"{}").status_code == 401


def test_ping_answers_pong():
    body, headers = signed({"type": 1})
    response = client.post("/interactions", content=body, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"type": 1}


def test_command_is_deferred_and_forwarded(monkeypatch):
    seen = []
    monkeypatch.setattr(
        adapter, "forward", lambda h, b, t: seen.append((dict(h), b, t)) or b""
    )
    body, headers = signed({"type": 2, "data": {"name": "upcoming"}})
    response = client.post("/interactions", content=body, headers=headers)
    assert response.json() == {"type": 5, "data": {"flags": 64}}
    ((forwarded_headers, forwarded_body, timeout),) = seen
    assert forwarded_body == body
    assert forwarded_headers["x-signature-ed25519"] == headers["X-Signature-Ed25519"]
    assert timeout == adapter.BACKEND_TIMEOUT


def test_forward_failure_does_not_break_the_ack(monkeypatch):
    def failing(h, b, t):
        raise TimeoutError("backend asleep")

    monkeypatch.setattr(adapter, "forward", failing)
    body, headers = signed({"type": 3, "data": {"custom_id": "avail:1:3:yes"}})
    assert (
        client.post("/interactions", content=body, headers=headers).json()["type"] == 5
    )


def test_autocomplete_relays_the_backend_answer(monkeypatch):
    choices = {"type": 8, "data": {"choices": [{"name": "Wk 3 vs Foo", "value": 451}]}}
    monkeypatch.setattr(
        adapter, "forward", lambda h, b, t: json.dumps(choices).encode()
    )
    body, headers = signed({"type": 4, "data": {"name": "schedule"}})
    assert client.post("/interactions", content=body, headers=headers).json() == choices


def test_autocomplete_answers_empty_when_the_backend_is_late(monkeypatch):
    def late(h, b, t):
        assert t == adapter.AUTOCOMPLETE_TIMEOUT
        raise TimeoutError("cold")

    monkeypatch.setattr(adapter, "forward", late)
    body, headers = signed({"type": 4, "data": {"name": "schedule"}})
    response = client.post("/interactions", content=body, headers=headers)
    assert response.json() == {"type": 8, "data": {"choices": []}}


@pytest.mark.parametrize("path", ["/", "/api/interactions"])
def test_other_paths_are_not_found(path):
    assert client.post(path, content=b"{}").status_code in (404, 405)
