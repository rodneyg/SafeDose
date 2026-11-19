import json
import os
from pathlib import Path
import re

pr = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())["pull_request"]
number = int(pr["number"])
date = pr["merged_at"][:10]
# Keep event data on one line and preserve the plain-text formats read by the pages.
title = re.sub(r"\s+", " ", pr["title"]).strip().replace("—", ",").replace("|", "-")
if not title:
    raise ValueError("PR title is empty")
path = Path("changelog") / f"{date}-pr-{number}.md"
if not path.exists():
    path.write_text(f"---\ndate: {date}\ntitle: {title}\nstatus: published\nprs: {number}\n---\n## Improved\n- {title}\n")

