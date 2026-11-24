#!/usr/bin/env python3
"""Synthetic service placeholders for the disposable kind lab.

These processes are not the game. They do not call a model, take a payment,
or write the game database. The engine process is the only one that records
a synthetic effect, and it records each operation id once. The Storyteller
returns a proposal and refuses to commit. Notifications record a delivery
and apply no effect. Web/API forwards a command and returns 202, which is
not a commit. An older scene holder is a fixed contract assertion. This
process does not implement a historical fork.
"""

from __future__ import annotations

import json
import os
import re
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROLE = os.environ.get("ROLE", "")
PORT = int(os.environ.get("PORT", "8080"))
ENGINE_URL = os.environ.get("ENGINE_URL", "http://engine:8080").rstrip("/")

CONTRACT = "offscreen.synthetic-command.v1"
OLDER = "scene-older"
LATER = "scene-later"
ITEM = "sword-a"
HOLDER_EARLY = "holder-early"
HOLDER_LATE = "holder-late"
OP_RE = re.compile(r"^lab-op-[0-9a-f]{16}$")
ALLOWED = {"contract", "operationId", "sceneId", "item", "holder"}

LOCK = threading.Lock()
SCENES = {
    OLDER: {"sceneId": OLDER, "item": ITEM, "holder": HOLDER_EARLY},
    LATER: {"sceneId": LATER, "item": ITEM, "holder": HOLDER_EARLY},
}
EFFECTS = {}
PROPOSALS = {}
DELIVERIES = {}


def fail(status, reason):
    return status, {
        "role": ROLE,
        "error": reason,
        "committed": False,
        "checkpointWriter": ROLE == "engine",
        "gameDatabaseWrite": False,
        "placeholder": True,
        "historicalFork": False,
        "effectCount": 0,
    }


def parse_command(body):
    if not isinstance(body, dict):
        return None, "invalid-json"
    if set(body) - ALLOWED:
        return None, "unexpected-field"
    if body.get("contract") != CONTRACT:
        return None, "unknown-contract"
    operation_id = body.get("operationId")
    if not isinstance(operation_id, str) or OP_RE.fullmatch(operation_id) is None:
        return None, "rejected-operation-id"
    if body.get("sceneId") == OLDER:
        return None, "older-scene-is-immutable"
    if body.get("sceneId") != LATER:
        return None, "unknown-scene"
    if body.get("item") != ITEM:
        return None, "unknown-item"
    if body.get("holder") != HOLDER_LATE:
        return None, "unexpected-holder"
    return body, None


def parse_notice(body):
    if not isinstance(body, dict):
        return None, "invalid-json"
    if set(body) - ALLOWED:
        return None, "unexpected-field"
    if body.get("contract") != CONTRACT:
        return None, "unknown-contract"
    operation_id = body.get("operationId")
    if not isinstance(operation_id, str) or OP_RE.fullmatch(operation_id) is None:
        return None, "rejected-operation-id"
    return body, None


def status_body():
    body = {
        "role": ROLE,
        "placeholder": True,
        "runsGame": False,
        "callsModel": False,
        "takesPayment": False,
        "writesGameDatabase": False,
        "websocketServer": False,
        "cognee": False,
        "gameEconomy": False,
        "checkpointWriter": ROLE == "engine",
        "historicalFork": False,
        "nextImage": False,
        "nestImage": False,
    }
    with LOCK:
        if ROLE == "engine":
            body["recordedEffects"] = len(EFFECTS)
        elif ROLE == "storyteller":
            body["recordedProposals"] = len(PROPOSALS)
            body["committed"] = False
            body["effectCount"] = 0
        elif ROLE == "notifications":
            body["recordedDeliveries"] = len(DELIVERIES)
            body["effectCount"] = 0
        elif ROLE == "web-api":
            body["effectCount"] = 0
            body["storesCheckpoint"] = False
            body["committed"] = False
    return body


def scene_body(scene_id):
    with LOCK:
        scene = SCENES.get(scene_id)
        if scene is None:
            return None
        return {
            "role": "engine",
            "sceneId": scene["sceneId"],
            "item": scene["item"],
            "holder": scene["holder"],
            "historicalFork": False,
            "limit": "contract-assertion",
            "immutable": scene_id == OLDER,
            "gameDatabaseWrite": False,
            "placeholder": True,
            "checkpointWriter": True,
        }


def contract_body():
    with LOCK:
        older = SCENES[OLDER]["holder"]
        later = SCENES[LATER]["holder"]
    transferred = later == HOLDER_LATE
    unchanged = older == HOLDER_EARLY and transferred
    return {
        "role": "engine",
        "sceneId": OLDER,
        "item": ITEM,
        "holder": older,
        "laterSceneId": LATER,
        "laterHolder": later,
        "olderHolderUnchanged": unchanged,
        "transferDemonstrated": transferred,
        "historicalFork": False,
        "proposedForkInheritsLaterState": False,
        "limit": "contract-assertion",
        "claim": (
            "An older scene synthetic item holder does not change because a "
            "later scene transferred the item. Historical forks are not implemented."
        ),
        "gameDatabaseWrite": False,
        "placeholder": True,
        "checkpointWriter": True,
    }


def apply_engine(body):
    parsed, reason = parse_command(body)
    if reason == "older-scene-is-immutable":
        return fail(409, reason)
    if reason:
        return fail(400, reason)
    operation_id = parsed["operationId"]
    with LOCK:
        if SCENES[OLDER]["holder"] != HOLDER_EARLY:
            return fail(500, "older-scene-mutated")
        record = EFFECTS.get(operation_id)
        if record is None:
            SCENES[LATER]["holder"] = HOLDER_LATE
            record = {
                "role": "engine",
                "operationId": operation_id,
                "contract": CONTRACT,
                "effectCount": 1,
                "attemptsSeen": 1,
                "sceneId": LATER,
                "item": ITEM,
                "holder": HOLDER_LATE,
                "gameDatabaseWrite": False,
                "historicalFork": False,
                "placeholder": True,
                "checkpointWriter": True,
                "committed": False,
            }
            EFFECTS[operation_id] = record
            duplicate = False
        else:
            record["attemptsSeen"] += 1
            duplicate = True
        response = dict(record)
        response["duplicate"] = duplicate
        response["applied"] = not duplicate
        response["olderHolder"] = SCENES[OLDER]["holder"]
        response["laterHolder"] = SCENES[LATER]["holder"]
        response["recordedEffects"] = len(EFFECTS)
        return 200, response


def operation_body(operation_id):
    if OP_RE.fullmatch(operation_id) is None:
        return fail(400, "rejected-operation-id")
    with LOCK:
        record = EFFECTS.get(operation_id)
        if record is None:
            return fail(404, "unknown-operation")
        response = dict(record)
        response["olderHolder"] = SCENES[OLDER]["holder"]
        response["laterHolder"] = SCENES[LATER]["holder"]
        response["recordedEffects"] = len(EFFECTS)
        return 200, response


def propose(body):
    parsed, reason = parse_notice(body)
    if reason:
        return fail(400, reason)
    operation_id = parsed["operationId"]
    with LOCK:
        record = PROPOSALS.get(operation_id)
        if record is None:
            record = {
                "role": "storyteller",
                "operationId": operation_id,
                "contract": CONTRACT,
                "proposal": "synthetic-proposal",
                "proposalCount": 1,
                "attemptsSeen": 1,
                "effectCount": 0,
                "committed": False,
                "checkpointWriter": False,
                "gameDatabaseWrite": False,
                "placeholder": True,
                "historicalFork": False,
            }
            PROPOSALS[operation_id] = record
            duplicate = False
        else:
            record["attemptsSeen"] += 1
            duplicate = True
        response = dict(record)
        response["duplicate"] = duplicate
        response["recordedProposals"] = len(PROPOSALS)
        return 200, response


def reject_commit():
    return 409, {
        "role": "storyteller",
        "error": "storyteller-proposes-only",
        "committed": False,
        "checkpointWriter": False,
        "effectCount": 0,
        "gameDatabaseWrite": False,
        "placeholder": True,
        "historicalFork": False,
    }


def deliver(body):
    parsed, reason = parse_notice(body)
    if reason:
        return fail(400, reason)
    operation_id = parsed["operationId"]
    with LOCK:
        record = DELIVERIES.get(operation_id)
        if record is None:
            record = {
                "role": "notifications",
                "operationId": operation_id,
                "contract": CONTRACT,
                "deliveryCount": 1,
                "attemptsSeen": 1,
                "effectCount": 0,
                "committed": False,
                "checkpointWriter": False,
                "gameDatabaseWrite": False,
                "placeholder": True,
                "historicalFork": False,
            }
            DELIVERIES[operation_id] = record
            duplicate = False
        else:
            record["attemptsSeen"] += 1
            duplicate = True
        response = dict(record)
        response["duplicate"] = duplicate
        response["recordedDeliveries"] = len(DELIVERIES)
        return 200, response


def post_json(url, payload):
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"error": "upstream-error"}
        return exc.code, parsed
    except urllib.error.URLError:
        return 503, {
            "role": ROLE,
            "error": "engine-unreachable",
            "committed": False,
            "checkpointWriter": False,
            "gameDatabaseWrite": False,
            "placeholder": True,
            "historicalFork": False,
            "effectCount": 0,
        }


def forward_command(body):
    if not isinstance(body, dict):
        return fail(400, "invalid-json")
    status, upstream = post_json(ENGINE_URL + "/commands", body)
    if not isinstance(upstream, dict):
        return fail(502, "upstream-error")
    if status != 200:
        upstream["committed"] = False
        upstream["accepted"] = False
        upstream.setdefault("gameDatabaseWrite", False)
        upstream.setdefault("placeholder", True)
        return status, upstream
    return 202, {
        "role": "web-api",
        "accepted": True,
        "committed": False,
        "httpStatusMeaning": "accepted-not-committed",
        "operationId": upstream.get("operationId"),
        "duplicate": upstream.get("duplicate"),
        "engineEffectCount": upstream.get("effectCount"),
        "storesCheckpoint": False,
        "sseHintIsCommit": False,
        "checkpointWriter": False,
        "gameDatabaseWrite": False,
        "placeholder": True,
        "historicalFork": False,
    }


def read_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length < 0 or length > 2048:
        return None, fail(413, "body-too-large")
    raw = handler.rfile.read(length) if length else b""
    if not raw:
        return None, fail(400, "invalid-json")
    try:
        body = json.loads(raw.decode())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None, fail(400, "invalid-json")
    return body, None


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if self.path.split("?", 1)[0] == "/healthz":
            return
        super().log_message(fmt, *args)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/healthz":
            body = {"ok": True, "role": ROLE, "placeholder": True}
            if ROLE not in {"web-api", "engine", "storyteller", "notifications"}:
                self.respond(500, fail(500, "unknown-role")[1])
                return
            self.respond(200, body)
            return
        if path == "/status":
            self.respond(200, status_body())
            return
        if ROLE == "engine" and path == "/contract/older-scene-holder":
            self.respond(200, contract_body())
            return
        if ROLE == "engine" and path.startswith("/scenes/"):
            scene = scene_body(path[len("/scenes/") :])
            if scene is None:
                self.respond(*fail(404, "unknown-scene"))
                return
            self.respond(200, scene)
            return
        if ROLE == "engine" and path.startswith("/operations/"):
            self.respond(*operation_body(path[len("/operations/") :]))
            return
        if ROLE == "web-api" and path == "/api/local-effects":
            self.respond(
                200,
                {
                    "role": "web-api",
                    "effectCount": 0,
                    "storesCheckpoint": False,
                    "committed": False,
                    "gameDatabaseWrite": False,
                    "placeholder": True,
                    "checkpointWriter": False,
                },
            )
            return
        self.respond(*fail(404, "not-found"))

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        body, error = read_body(self)
        if error is not None:
            self.respond(*error)
            return
        if ROLE == "web-api" and path == "/api/commands":
            self.respond(*forward_command(body))
            return
        if ROLE == "engine" and path == "/commands":
            self.respond(*apply_engine(body))
            return
        if ROLE == "storyteller" and path == "/proposals":
            self.respond(*propose(body))
            return
        if ROLE == "storyteller" and path == "/commit":
            self.respond(*reject_commit())
            return
        if ROLE == "notifications" and path == "/deliveries":
            self.respond(*deliver(body))
            return
        self.respond(*fail(404, "not-found"))

    def respond(self, status, payload):
        raw = json.dumps(payload, sort_keys=True).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(raw)


def main():
    if ROLE not in {"web-api", "engine", "storyteller", "notifications"}:
        raise SystemExit("ROLE must be web-api, engine, storyteller, or notifications")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
