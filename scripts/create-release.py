#!/usr/bin/env python3
"""Create the next semver tag and GitHub Release for a merge to main."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
FEAT_RE = re.compile(r"^feat(\(.+\))?!", re.I)
FEAT_MINOR_RE = re.compile(r"^feat(\(.+\))?:", re.I)
BREAKING_RE = re.compile(r"^(.+)!:|BREAKING CHANGE:", re.I)
MAJOR_LABELS = {"major", "semver:major", "breaking"}
MINOR_LABELS = {"minor", "semver:minor"}


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def latest_tag():
    proc = run(["git", "tag", "--list", "v*.*.*", "--sort=-v:refname"], check=False)
    tags = [line.strip() for line in proc.stdout.splitlines() if TAG_RE.match(line.strip())]
    if not tags:
        return (0, 0, 0), None
    major, minor, patch = map(int, TAG_RE.match(tags[0]).groups())
    return (major, minor, patch), tags[0]


def bump(version, kind):
    major, minor, patch = version
    if kind == "major":
        return (major + 1, 0, 0)
    if kind == "minor":
        return (major, minor + 1, 0)
    return (major, minor, patch + 1)


def bump_kind(message, labels):
    lowered = {label.lower() for label in labels}
    lines = (message or "").strip().splitlines()
    first = lines[0] if lines else ""
    body = message or ""
    if lowered & MAJOR_LABELS or "BREAKING CHANGE:" in body or BREAKING_RE.match(first):
        return "major"
    if lowered & MINOR_LABELS or FEAT_MINOR_RE.match(first):
        return "minor"
    return "patch"


def api(method, path, body=None):
    token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPOSITORY"]
    url = f"https://api.github.com/repos/{repo}{path}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        if method == "GET" and path.startswith("/releases/tags/") and exc.code == 404:
            return None
        raise SystemExit(f"GitHub API {method} {path} failed: {exc.code} {detail}") from exc


def pr_labels_and_number(sha):
    pulls = api("GET", f"/commits/{sha}/pulls")
    if not isinstance(pulls, list) or not pulls:
        return [], None, None
    pull = pulls[0]
    labels = [item.get("name") or "" for item in pull.get("labels") or []]
    return labels, pull.get("number"), pull.get("title")


def changelog_notes(pr_number):
    if not pr_number:
        return None
    root = os.getcwd()
    folder = os.path.join(root, "changelog")
    if not os.path.isdir(folder):
        return None
    suffix = f"-pr-{pr_number}.md"
    matches = sorted(
        name for name in os.listdir(folder) if name.endswith(suffix)
    )
    if not matches:
        return None
    return open(os.path.join(folder, matches[-1]), encoding="utf-8").read().strip()


def format_tag(version):
    return "v%d.%d.%d" % version


def resolve_sha():
    """Prefer RELEASE_SHA. GITHUB_SHA is reserved by Actions and stays on the checkout HEAD."""
    return (
        (os.environ.get("RELEASE_SHA") or "").strip()
        or (os.environ.get("GITHUB_SHA") or "").strip()
        or run(["git", "rev-parse", "HEAD"]).stdout.strip()
    )


def main():
    sha = resolve_sha()
    print("Release SHA:", sha)
    message = os.environ.get("GITHUB_EVENT_HEAD_COMMIT_MESSAGE") or ""
    if not message:
        message = run(["git", "log", "-1", "--format=%B", sha]).stdout
    labels, pr_number, pr_title = pr_labels_and_number(sha)
    kind = bump_kind(message, labels)
    current, current_tag = latest_tag()
    tagged = run(["git", "tag", "--points-at", sha], check=False).stdout.splitlines()
    existing_tags = [tag.strip() for tag in tagged if TAG_RE.match(tag.strip())]
    if existing_tags:
        tag = sorted(existing_tags, key=lambda value: tuple(map(int, TAG_RE.match(value).groups())))[-1]
        existing_release = api("GET", f"/releases/tags/{tag}")
        if existing_release:
            print("Commit already has a release:", existing_release.get("html_url") or tag)
            return 0
        notes = changelog_notes(pr_number) or message.strip() or f"Release {tag}"
        body = {
            "tag_name": tag,
            "target_commitish": sha,
            "name": tag,
            "body": notes,
            "draft": False,
            "prerelease": False,
        }
        created = api("POST", "/releases", body)
        print("Created missing release", created.get("html_url") or tag, "from", pr_title or tag)
        return 0
    next_version = bump(current, kind)
    tag = format_tag(next_version)
    notes = changelog_notes(pr_number) or message.strip() or f"Release {tag}"
    title = pr_title or tag
    print(f"Bumping {current_tag or 'no previous tag'} with a {kind} bump to {tag}")
    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "tag", "-a", "-m", tag, tag, sha])
    pointed = run(["git", "rev-list", "-n", "1", tag]).stdout.strip()
    if pointed != sha:
        raise SystemExit(f"tag {tag} points at {pointed}, expected {sha}")
    run(["git", "push", "origin", tag])
    body = {
        "tag_name": tag,
        "target_commitish": sha,
        "name": tag,
        "body": notes,
        "draft": False,
        "prerelease": False,
    }
    created = api("POST", "/releases", body)
    print("Created release", created.get("html_url") or tag, "from", title)
    return 0


if __name__ == "__main__":
    sys.exit(main())
