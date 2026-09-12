"""Discord interactions adapter.

Discord POSTs every slash command, button press and autocomplete here. The
adapter checks Discord's Ed25519 signature, answers within Discord's 3-second
wall, and forwards the signed payload as is to the backend, which checks the
same signature again and does the work. Nothing here knows a command.
"""

import json
import logging
import os
import time
import urllib.request
from collections.abc import Mapping
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from starlette.applications import Starlette
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Interaction types Discord sends, and the response types it accepts
PING, AUTOCOMPLETE = 1, 4
PONG, DEFERRED, AUTOCOMPLETE_RESULT = 1, 5, 8
EPHEMERAL = (
    64  # the deferred reply is private; the backend posts public text as a follow-up
)

PUBLIC_KEY = Ed25519PublicKey.from_public_bytes(
    bytes.fromhex(os.environ["DISCORD_PUBLIC_KEY"])
)
# The backend route that takes the forwarded interaction, in full
BACKEND_URL = os.environ["BACKEND_URL"]
DISCORD_API = "https://discord.com/api/v10"
BACKEND_TIMEOUT = 60.0  # the backend's own maxDuration
# Autocomplete has no deferred answer, so it waits inside the wall
AUTOCOMPLETE_TIMEOUT = 2.0
TELL_TIMEOUT = 5.0  # the edit of a deferred reply nobody is waiting on


def verified(headers: Mapping[str, str], body: bytes) -> bool:
    """True when the body carries Discord's signature over timestamp + body."""
    try:
        PUBLIC_KEY.verify(
            bytes.fromhex(headers.get("x-signature-ed25519", "")),
            headers.get("x-signature-timestamp", "").encode() + body,
        )
    except (InvalidSignature, ValueError):
        return False
    return True


def forward(headers: Mapping[str, str], body: bytes, timeout: float) -> bytes:
    """POST the interaction to the backend as Discord sent it, and answer its body."""
    request = urllib.request.Request(
        BACKEND_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Signature-Ed25519": headers["x-signature-ed25519"],
            "X-Signature-Timestamp": headers["x-signature-timestamp"],
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def tell(payload: Mapping[str, Any], text: str) -> None:
    """Edit the deferred reply ourselves; the interaction token is the whole
    authorization, so the adapter still holds no bot token."""
    request = urllib.request.Request(
        f"{DISCORD_API}/webhooks/{payload['application_id']}/{payload['token']}/messages/@original",
        data=json.dumps({"content": text}).encode(),
        method="PATCH",
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(request, timeout=TELL_TIMEOUT).close()
    except OSError as error:
        logger.error("telling the member failed: %s", error)


def forward_later(
    headers: Mapping[str, str], body: bytes, payload: dict[str, Any]
) -> None:
    """The background forward; the backend edits the deferred reply itself.

    When the forward fails outright the backend never will, so the adapter
    edits the deferred reply instead of leaving it spinning for 15 minutes. A
    read timeout is left alone: the backend may be mid-write and edit it itself.
    """
    started = time.monotonic()
    try:
        forward(headers, body, BACKEND_TIMEOUT)
    except OSError as error:  # HTTPError, URLError and a timeout are all OSError
        logger.error(
            "backend forward failed after %.1fs: %s", time.monotonic() - started, error
        )
        if not isinstance(error, TimeoutError):
            tell(payload, "The site did not answer. Try again in a minute.")
        return
    logger.info("backend answered in %.1fs", time.monotonic() - started)


async def interactions(request: Request) -> Response:
    body = await request.body()
    if not verified(request.headers, body):
        return JSONResponse({"error": "bad signature"}, status_code=401)
    payload = json.loads(body)
    kind = payload.get("type")
    if kind == PING:
        return JSONResponse({"type": PONG})
    if kind == AUTOCOMPLETE:
        started = time.monotonic()
        try:
            answer = await run_in_threadpool(
                forward, request.headers, body, AUTOCOMPLETE_TIMEOUT
            )
        except OSError as error:  # a cold backend: an empty list beats no answer
            logger.warning(
                "autocomplete fell back to no choices after %.1fs: %s",
                time.monotonic() - started,
                error,
            )
            return JSONResponse({"type": AUTOCOMPLETE_RESULT, "data": {"choices": []}})
        return Response(answer, media_type="application/json")
    return JSONResponse(
        {"type": DEFERRED, "data": {"flags": EPHEMERAL}},
        background=BackgroundTask(forward_later, request.headers, body, payload),
    )


async def health(request: Request) -> Response:
    return JSONResponse({"ok": True})


app = Starlette(
    routes=[
        Route("/interactions", interactions, methods=["POST"]),
        Route("/health", health),
    ]
)
