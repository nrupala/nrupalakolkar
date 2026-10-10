#!/usr/bin/env python3
"""deploy-signed client — request a signed deploy certificate after deploying.

Usage:
  deploy_signed_client.py <worker> [--repo owner/name] [--commit SHA]
      [--surface ci|laptop|box|vm] [--sha256 HEX] [--version-id ID]
      [--token-file PATH] [--timeout SECONDS]

Flow: POSTs a sign request to the site-integrity worker; the VM signer
verifies the LIVE artifact on Cloudflare and only then signs it into the
ledger. This client polls until the certificate is issued (exit 0), refused
(exit 2), or the timeout hits (exit 3). The deploy signing KEY never leaves
the signer VM; this client only holds a scoped request token.

Token sources (first hit wins): $DEPLOY_SIGN_TOKEN, --token-file,
~/.config/deploy-sign/token.
"""
import sys, os, json, time, hashlib, argparse, urllib.request, urllib.error

ENDPOINT = os.environ.get(
    "DEPLOY_SIGN_ENDPOINT",
    "https://site-integrity.nrupalakolkar.workers.dev/__sign-request")


def load_token(args):
    if os.environ.get("DEPLOY_SIGN_TOKEN"):
        return os.environ["DEPLOY_SIGN_TOKEN"].strip()
    path = args.token_file or os.path.expanduser("~/.config/deploy-sign/token")
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def call(method, url, token, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Content-Type": "application/json", "x-sign-token": token,
        "User-Agent": "deploy-signed-client/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"ok": False, "error": f"HTTP {e.code}"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("worker")
    ap.add_argument("--repo", default=None)
    ap.add_argument("--commit", default=None)
    ap.add_argument("--surface", default=None)
    ap.add_argument("--sha256", default=None,
                    help="claimed artifact hash; signer refuses on mismatch")
    ap.add_argument("--file", default=None,
                    help="local module file; its sha256 is sent as the claim")
    ap.add_argument("--version-id", default=None)
    ap.add_argument("--token-file", default=None)
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    token = load_token(args)
    if not token:
        print("no sign token: set $DEPLOY_SIGN_TOKEN or ~/.config/deploy-sign/token",
              file=sys.stderr)
        return 3

    sha = args.sha256
    if args.file:
        with open(args.file, "rb") as f:
            sha = hashlib.sha256(f.read()).hexdigest()

    payload = {"worker": args.worker, "repo": args.repo, "commit": args.commit,
               "surface": args.surface, "sha256": sha,
               "version_id": args.version_id}
    st, res = call("POST", ENDPOINT, token, payload)
    if st != 200 or not res.get("ok"):
        print(f"sign request rejected: {st} {res}", file=sys.stderr)
        return 3
    rid = res["id"]
    print(f"sign request {rid} queued for {args.worker}; waiting for signer…")

    deadline = time.time() + args.timeout
    while time.time() < deadline:
        time.sleep(10)
        st, res = call("GET", f"{ENDPOINT}/{rid}", token)
        if st != 200 or not res.get("ok"):
            continue
        rec = res["request"]
        if rec["status"] == "signed":
            cert = rec.get("cert") or {}
            print(json.dumps({"signed": True, "worker": args.worker,
                              "sha256": cert.get("sha256"),
                              "ts": cert.get("ts"),
                              "sig": (cert.get("sig") or "")[:32] + "…"}))
            return 0
        if rec["status"] == "refused":
            print(f"signing REFUSED: {rec.get('reason')}", file=sys.stderr)
            return 2
    print("timed out waiting for signer", file=sys.stderr)
    return 3


if __name__ == "__main__":
    sys.exit(main())
