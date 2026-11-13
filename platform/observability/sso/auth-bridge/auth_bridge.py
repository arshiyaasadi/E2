#!/usr/bin/env python3
"""Abysso Keycloak OIDC bridge in front of SigNoz CE.

Proxies UI/API to SigNoz. When ABYSSO_OIDC_ENABLED=true:
  - /signup and /login (without jwt) redirect to Keycloak
  - /api/v1/complete/oidc exchanges the code, maps the user, mints SigNoz JWTs
  - POST /api/v1/register is blocked

Does not copy SigNoz Enterprise SSO. JWTs use SIGNOZ_JWT_SECRET (same as SigNoz).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.client import HTTPConnection, HTTPSConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional, Tuple

LISTEN_HOST = os.environ.get("ABYSSO_BRIDGE_LISTEN", "0.0.0.0")
LISTEN_PORT = int(os.environ.get("ABYSSO_BRIDGE_PORT", "8080"))
UPSTREAM = os.environ.get("SIGNOZ_UPSTREAM", "http://127.0.0.1:8080").rstrip("/")
OIDC_ENABLED = os.environ.get("ABYSSO_OIDC_ENABLED", "false").lower() == "true"
DISABLE_SIGNUP = os.environ.get("ABYSSO_DISABLE_SIGNUP", "true").lower() == "true"
ISSUER = os.environ.get("ABYSSO_OIDC_ISSUER", "").rstrip("/")
CLIENT_ID = os.environ.get("ABYSSO_OIDC_CLIENT_ID", "signoz")
CLIENT_SECRET = os.environ.get("ABYSSO_OIDC_CLIENT_SECRET", "")
REDIRECT_URI = os.environ.get(
    "ABYSSO_OIDC_REDIRECT_URI", "https://noz.abysso.ir/api/v1/complete/oidc"
)
JWT_SECRET = os.environ.get("SIGNOZ_JWT_SECRET", "")
ADMIN_EMAIL = os.environ.get("SIGNOZ_BOOTSTRAP_EMAIL", "platform-admin@abysso.ir")
ADMIN_PASSWORD = os.environ.get("SIGNOZ_BOOTSTRAP_PASSWORD", "")
ACCESS_TTL = int(os.environ.get("SIGNOZ_JWT_ACCESS_TTL", str(30 * 60)))
REFRESH_TTL = int(os.environ.get("SIGNOZ_JWT_REFRESH_TTL", str(30 * 24 * 3600)))

ROLE_MAP = {
    "platform-super-admin": "ADMIN",
    "store-owner": "EDITOR",
    "store-admin": "EDITOR",
    "store-editor": "VIEWER",
}

_state_lock = threading.Lock()
# state -> (expires_at, code_verifier)
_pending_states: Dict[str, Tuple[float, str]] = {}


def log(msg: str) -> None:
    print(f"abysso-auth-bridge: {msg}", flush=True)


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def pkce_pair() -> Tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def mint_jwt(claims: Dict[str, Any]) -> str:
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64url(json.dumps(claims, separators=(",", ":")).encode())
    sig = b64url(
        hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{sig}"


def http_json(method: str, url: str, body: Optional[dict] = None, headers: Optional[dict] = None) -> Tuple[int, Any]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={**(headers or {}), **({"Content-Type": "application/json"} if body is not None else {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            if not raw:
                return resp.status, None
            return resp.status, json.loads(raw.decode())
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw.decode()) if raw else None
        except Exception:
            return e.code, {"error": raw.decode(errors="replace")[:500]}


def form_post(url: str, fields: Dict[str, str]) -> Tuple[int, Any]:
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        url, data=data, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw.decode()) if raw else None
        except Exception:
            return e.code, {"error": raw.decode(errors="replace")[:500]}


def remember_state(state: str, code_verifier: str) -> None:
    now = time.time()
    with _state_lock:
        expired = [k for k, (exp, _) in _pending_states.items() if exp < now]
        for k in expired:
            _pending_states.pop(k, None)
        _pending_states[state] = (now + 600, code_verifier)


def consume_state(state: str) -> Optional[str]:
    with _state_lock:
        item = _pending_states.pop(state, None)
    if not item:
        return None
    exp, verifier = item
    if exp < time.time():
        return None
    return verifier


def oidc_authorize_url() -> str:
    state = secrets.token_urlsafe(24)
    verifier, challenge = pkce_pair()
    remember_state(state, verifier)
    q = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "response_type": "code",
            "scope": "openid email profile",
            "redirect_uri": REDIRECT_URI,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )
    return f"{ISSUER}/protocol/openid-connect/auth?{q}"


def map_role(realm_roles: list) -> str:
    for kc, sz in ROLE_MAP.items():
        if kc in realm_roles:
            return sz
    return "VIEWER"


def admin_token() -> str:
    if not ADMIN_PASSWORD:
        raise RuntimeError("SIGNOZ_BOOTSTRAP_PASSWORD is required for user lookup")
    code, body = http_json(
        "POST",
        f"{UPSTREAM}/api/v1/login",
        {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if code != 200 or not body or "data" not in body:
        raise RuntimeError(f"bootstrap login failed: {code} {body}")
    return body["data"]["accessJwt"]


def ensure_signoz_user(email: str, display_name: str, role: str) -> Dict[str, str]:
    token = admin_token()
    code, body = http_json(
        "GET", f"{UPSTREAM}/api/v1/user", headers={"Authorization": f"Bearer {token}"}
    )
    if code != 200 or not body:
        raise RuntimeError(f"list users failed: {code}")
    users = body.get("data") or []
    for u in users:
        if (u.get("email") or "").lower() == email.lower():
            return {
                "id": u["id"],
                "email": u["email"],
                "role": u.get("role") or role,
                "orgId": u.get("orgId") or "",
            }

    # Invite + accept for first-time Keycloak operators.
    inv_code, inv_body = http_json(
        "POST",
        f"{UPSTREAM}/api/v1/invite",
        {
            "email": email,
            "name": display_name or email.split("@")[0],
            "role": role,
            "frontendBaseUrl": "https://noz.abysso.ir",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    if inv_code not in (200, 201) or not inv_body:
        raise RuntimeError(f"invite failed: {inv_code} {inv_body}")

    invite_token = _extract_invite_token(inv_body)
    if not invite_token:
        # List pending invites as fallback.
        li_code, li_body = http_json(
            "GET", f"{UPSTREAM}/api/v1/invite", headers={"Authorization": f"Bearer {token}"}
        )
        for inv in (li_body or {}).get("data") or []:
            if (inv.get("email") or "").lower() == email.lower():
                invite_token = inv.get("token") or inv.get("id")
                break
    if not invite_token:
        raise RuntimeError(f"invite response missing token: {inv_body}")

    # Temporary password — operators authenticate via Keycloak only.
    tmp_password = secrets.token_urlsafe(24) + "Aa1!"
    acc_code, acc_body = http_json(
        "POST",
        f"{UPSTREAM}/api/v1/invite/accept",
        {
            "token": invite_token,
            "password": tmp_password,
            "displayName": display_name or email.split("@")[0],
        },
    )
    if acc_code not in (200, 201):
        raise RuntimeError(f"accept invite failed: {acc_code} {acc_body}")

    code3, body3 = http_json(
        "GET", f"{UPSTREAM}/api/v1/user", headers={"Authorization": f"Bearer {token}"}
    )
    for u in (body3 or {}).get("data") or []:
        if (u.get("email") or "").lower() == email.lower():
            return {
                "id": u["id"],
                "email": u["email"],
                "role": u.get("role") or role,
                "orgId": u.get("orgId") or "",
            }
    raise RuntimeError("user not found after invite accept")


def _decode_jwt_payload(token: str) -> Dict[str, Any]:
    if not token or token.count(".") < 2:
        return {}
    part = token.split(".")[1]
    part += "=" * ((4 - len(part) % 4) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(part.encode()).decode())
    except Exception:
        return {}


def _extract_invite_token(body: Any) -> Optional[str]:
    data = body.get("data") if isinstance(body, dict) else None
    candidates = []
    if isinstance(data, dict):
        candidates.append(data)
    elif isinstance(data, list):
        candidates.extend(data)
    if isinstance(body, dict):
        candidates.append(body)
    for item in candidates:
        if not isinstance(item, dict):
            continue
        for key in ("token", "id"):
            if item.get(key):
                return str(item[key])
        link = item.get("inviteLink") or item.get("InviteLink") or ""
        if "token=" in str(link):
            return urllib.parse.parse_qs(urllib.parse.urlparse(str(link)).query).get("token", [""])[0] or None
    return None


def complete_oidc(code: str, state: str) -> str:
    code_verifier = consume_state(state)
    if not code_verifier:
        raise RuntimeError("invalid or expired OIDC state")
    tok_code, tok = form_post(
        f"{ISSUER}/protocol/openid-connect/token",
        {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "code_verifier": code_verifier,
        },
    )
    if tok_code != 200 or not tok or "access_token" not in tok:
        raise RuntimeError(f"token exchange failed: {tok_code} {tok}")

    ui_code, info = http_json(
        "GET",
        f"{ISSUER}/protocol/openid-connect/userinfo",
        headers={"Authorization": f"Bearer {tok['access_token']}"},
    )
    if ui_code != 200 or not info:
        info = {}
    # Merge claims from id_token (realm roles often live here).
    id_claims = _decode_jwt_payload(tok.get("id_token") or "")
    merged = {**id_claims, **(info or {})}

    email = (merged.get("email") or "").strip().lower()
    if not email:
        raise RuntimeError("OIDC profile missing email")
    name = merged.get("name") or merged.get("preferred_username") or email.split("@")[0]
    realm_roles = []
    if isinstance(merged.get("realm_access"), dict):
        realm_roles = list(merged["realm_access"].get("roles") or [])
    if not realm_roles and isinstance(merged.get("roles"), list):
        realm_roles = merged["roles"]
    role = map_role(realm_roles)

    user = ensure_signoz_user(email, name, role)
    now = int(time.time())
    access = mint_jwt(
        {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "orgId": user["orgId"],
            "iat": now,
            "exp": now + ACCESS_TTL,
        }
    )
    refresh = mint_jwt(
        {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "orgId": user["orgId"],
            "iat": now,
            "exp": now + REFRESH_TTL,
        }
    )
    q = urllib.parse.urlencode({"jwt": access, "refreshjwt": refresh, "usr": user["id"]})
    return f"/login?{q}"


def parse_upstream(url: str) -> Tuple[str, str, int, str]:
    u = urllib.parse.urlparse(url)
    scheme = u.scheme or "http"
    host = u.hostname or "127.0.0.1"
    port = u.port or (443 if scheme == "https" else 80)
    return scheme, host, port, u.path or ""


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        log(f"{self.address_string()} {fmt % args}")

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    def _send(self, status: int, body: bytes, content_type: str = "text/plain; charset=utf-8") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    def _redirect(self, location: str, status: int = 302) -> None:
        self.send_response(status)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _should_oidc_gate(self, path: str) -> bool:
        if not OIDC_ENABLED:
            return False
        if path.rstrip("/") == "/signup" and DISABLE_SIGNUP:
            return True
        if path.rstrip("/") == "/login":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            # Allow JWT completion / SSO error page / local password fallback.
            if qs.get("jwt") or qs.get("ssoerror") or qs.get("password"):
                return False
            return True
        return False

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path or "/"

        if OIDC_ENABLED and path.rstrip("/") == "/api/v1/complete/oidc":
            qs = urllib.parse.parse_qs(parsed.query)
            if qs.get("error"):
                self._redirect("/login?ssoerror=" + urllib.parse.quote(qs["error"][0]))
                return
            code = (qs.get("code") or [""])[0]
            state = (qs.get("state") or [""])[0]
            try:
                dest = complete_oidc(code, state)
                self._redirect(dest)
            except Exception as e:
                log(f"oidc complete error: {e}")
                self._redirect("/login?ssoerror=oidc_failed")
            return

        if self._should_oidc_gate(path):
            if not ISSUER or not CLIENT_SECRET:
                self._send(500, b"OIDC is enabled but issuer/secret is not configured\n")
                return
            self._redirect(oidc_authorize_url())
            return

        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path or "/"
        if OIDC_ENABLED and DISABLE_SIGNUP and path.rstrip("/") in (
            "/api/v1/register",
            "/api/v1/register/signup",
        ):
            body = json.dumps(
                {
                    "status": "error",
                    "error": {
                        "code": "forbidden",
                        "message": "Public signup is disabled. Use Keycloak SSO.",
                    },
                }
            ).encode()
            self._send(403, body, "application/json")
            return
        self._proxy()

    def do_PUT(self) -> None:  # noqa: N802
        self._proxy()

    def do_PATCH(self) -> None:  # noqa: N802
        self._proxy()

    def do_DELETE(self) -> None:  # noqa: N802
        self._proxy()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._proxy()

    def _proxy(self) -> None:
        scheme, host, port, _ = parse_upstream(UPSTREAM)
        body = self._read_body()
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length")}
        headers["Host"] = f"{host}:{port}" if port not in (80, 443) else host
        headers["Content-Length"] = str(len(body))
        conn: HTTPConnection
        if scheme == "https":
            conn = HTTPSConnection(host, port, timeout=120)
        else:
            conn = HTTPConnection(host, port, timeout=120)
        try:
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
            data = resp.read()
            self.send_response(resp.status)
            hop = {"transfer-encoding", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "upgrade", "content-length"}
            for k, v in resp.getheaders():
                if k.lower() in hop:
                    continue
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        except Exception as e:
            log(f"proxy error: {e}")
            self._send(502, f"upstream error: {e}\n".encode())
        finally:
            conn.close()


def main() -> int:
    if OIDC_ENABLED:
        log(f"OIDC on issuer={ISSUER or 'UNSET'} upstream={UPSTREAM} signup_disabled={DISABLE_SIGNUP}")
        if not ISSUER or not CLIENT_SECRET:
            log("WARNING: OIDC enabled but issuer/client secret missing")
    else:
        log(f"OIDC off; proxying to {UPSTREAM}")
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    log(f"listening on {LISTEN_HOST}:{LISTEN_PORT}")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
