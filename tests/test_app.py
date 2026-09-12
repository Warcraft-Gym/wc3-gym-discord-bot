"""The adapter's whole contract: refuse a bad signature, answer PING, defer and
forward everything else, relay autocomplete inside the wall."""

import json
import os
import time
import urllib.request

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


def press(**extra):
    return {
        "type": 3,
        "application_id": "app-1",
        "token": "tok-1",
        "data": {"custom_id": "avail:1:3:yes"},
        **extra,
    }


def test_forward_failure_does_not_break_the_ack(monkeypatch):
    def failing(h, b, t):
        raise TimeoutError("backend asleep")

    monkeypatch.setattr(adapter, "forward", failing)
    monkeypatch.setattr(adapter, "tell", lambda payload, text: None)
    body, headers = signed(press())
    assert (
        client.post("/interactions", content=body, headers=headers).json()["type"] == 5
    )


def test_a_failed_forward_tells_the_member(monkeypatch):
    def refused(h, b, t):
        raise ConnectionRefusedError("backend down")

    told = []
    monkeypatch.setattr(adapter, "forward", refused)
    monkeypatch.setattr(
        adapter, "tell", lambda payload, text: told.append((payload, text))
    )
    body, headers = signed(press())
    client.post("/interactions", content=body, headers=headers)
    ((payload, text),) = told
    assert payload["token"] == "tok-1"
    assert text == "The site did not answer. Try again in a minute."


def test_a_read_timeout_leaves_the_reply_to_the_backend(monkeypatch):
    def late(h, b, t):
        raise TimeoutError("still writing")

    told = []
    monkeypatch.setattr(adapter, "forward", late)
    monkeypatch.setattr(adapter, "tell", lambda payload, text: told.append(text))
    body, headers = signed(press())
    client.post("/interactions", content=body, headers=headers)
    assert told == []


def test_tell_patches_the_original_reply(monkeypatch):
    seen = []

    class Answer:
        def close(self):
            pass

    monkeypatch.setattr(
        urllib.request,
        "urlopen",
        lambda request, timeout: seen.append(request) or Answer(),
    )
    adapter.tell({"application_id": "app-1", "token": "tok-1"}, "gone")
    (request,) = seen
    assert request.full_url == (
        "https://discord.com/api/v10/webhooks/app-1/tok-1/messages/@original"
    )
    assert request.get_method() == "PATCH"
    assert json.loads(request.data) == {"content": "gone"}


def test_forward_posts_the_signed_body_with_discords_headers(monkeypatch):
    seen = []

    class Answer:
        def read(self):
            return b'{"ok": true}'

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        urllib.request,
        "urlopen",
        lambda request, timeout: seen.append((request, timeout)) or Answer(),
    )
    body, headers = signed({"type": 2, "data": {"name": "upcoming"}})
    lowered = {name.lower(): value for name, value in headers.items()}
    assert adapter.forward(lowered, body, 7.0) == b'{"ok": true}'
    (request, timeout) = seen[0]
    assert request.full_url == adapter.BACKEND_URL
    assert request.get_method() == "POST"
    assert request.data == body
    assert timeout == 7.0
    # The spellings the backend re-verifies the signature with
    assert request.get_header("X-signature-ed25519") == headers["X-Signature-Ed25519"]
    assert (
        request.get_header("X-signature-timestamp") == headers["X-Signature-Timestamp"]
    )
    assert request.get_header("Content-type") == "application/json"


def test_autocomplete_relays_the_backend_answer(monkeypatch):
    choices = {"type": 8, "data": {"choices": [{"name": "Wk 3 vs Foo", "value": 451}]}}
    monkeypatch.setattr(
        adapter, "forward", lambda h, b, t: json.dumps(choices).encode()
    )
    body, headers = signed({"type": 4, "data": {"name": "schedule"}})
    assert client.post("/interactions", content=body, headers=headers).json() == choices


def test_autocomplete_answers_empty_when_the_backend_is_late(monkeypatch, caplog):
    def late(h, b, t):
        assert t == adapter.AUTOCOMPLETE_TIMEOUT
        raise TimeoutError("cold")

    monkeypatch.setattr(adapter, "forward", late)
    body, headers = signed({"type": 4, "data": {"name": "schedule"}})
    with caplog.at_level("WARNING"):
        response = client.post("/interactions", content=body, headers=headers)
    assert response.json() == {"type": 8, "data": {"choices": []}}
    assert "autocomplete fell back to no choices" in caplog.text


@pytest.mark.parametrize("path", ["/", "/api/interactions"])
def test_other_paths_are_not_found(path):
    assert client.post(path, content=b"{}").status_code in (404, 405)
