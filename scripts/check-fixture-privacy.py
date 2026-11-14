"""Reject changed fixture/eval images and common EXIF/XMP GPS markers.

This is a lightweight guard, not a complete metadata parser. Existing unchanged
images are deliberately outside the diff. No image dependencies are required.
"""

import re
import subprocess
import sys
from pathlib import PurePosixPath


def git(*args):
    return subprocess.check_output(['git', *args])


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: check-fixture-privacy.py BASE_SHA HEAD_SHA')
    base, head = sys.argv[1:]
    # A first push has no parent; compare it with an empty tree.
    if base == '0' * 40:
        base = subprocess.check_output(
            ['git', 'hash-object', '-t', 'tree', '--stdin'], input=b'',
        ).decode().strip()
    names = git('diff', '--name-only', '-z', '--diff-filter=ACMR', base, head, '--')
    images = {'.jpg', '.jpeg', '.png', '.heic', '.webp'}
    # GPS IFD pointer, TIFF LONG/count=1, in little and big endian EXIF.
    binary_markers = (b'\x25\x88\x04\x00\x01\x00\x00\x00',
                      b'\x88\x25\x00\x04\x00\x00\x00\x01')
    text_marker = re.compile(rb'GPS(?:Latitude|Longitude|Position|Info|DestLatitude|DestLongitude)', re.I)
    failures = []
    for raw in names.split(b'\0'):
        if not raw:
            continue
        name = raw.decode('utf-8', errors='surrogateescape')
        path = PurePosixPath(name)
        if path.suffix.lower() in images and any(
            'fixture' in part.lower() or 'eval' in part.lower()
            for part in path.parts[:-1]
        ):
            failures.append(f'{name}: fixture/eval image files are forbidden')
        # Read the exact head blob, including renamed files, never a symlink target.
        data = git('show', f'{head}:{name}')
        if text_marker.search(data) or any(marker in data for marker in binary_markers):
            failures.append(f'{name}: GPS metadata marker found')
    if failures:
        print('\n'.join(failures), file=sys.stderr)
        return 1
    print('Privacy check passed: no changed fixture/eval images or GPS metadata markers.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
