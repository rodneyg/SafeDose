#!/usr/bin/env python3
"""Second automated consistency pass. Not an independent human visual labeler.
Reconstructs units from geometric leading edges; locates dark stopper pixels.
Logs every disagreement and preserves pending human status. No API/network.
"""
import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3] / 'evals/vision'

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--store', type=Path, required=True)
    args = p.parse_args()
    rows = json.loads((ROOT/'synthetic-manifest.json').read_text())
    scenes = {s['id']: s for s in json.loads((args.store/'scene-audit.json').read_text())}
    checks = []
    for r in rows:
        s, label = scenes[r['id']], r['label']
        disagreements = []
        def compare(field, actual, expected):
            if actual != expected:
                disagreements.append(dict(field=field, labeler_1_value=actual, labeler_2_value=expected, resolution=None))
        factor = {'U-100': 100, 'U-40': 40, 'mL': 1}[s['scale']]
        fraction = (s['edge_x']-s['x0'])/(s['x1']-s['x0'])
        ml = round(fraction*s['capacity'], 6)
        compare('/fill/ml', label['fill']['ml'], None if s['bad'] else ml)
        compare('/fill/units', label['fill']['units'], None if s['bad'] or s['scale'] == 'mL' else round(ml*factor, 6))
        compare('/fill/empty', label['fill']['empty'], None if s['bad'] else ml == 0)
        compare('/fill/plunger_visible', label['fill']['plunger_visible'], not s['bad'])
        compare('/expected_behavior', label['expected_behavior'], 'refuse' if s['bad'] or s['scale'] == 'U-40' else 'read')
        compare('/syringe/scale', label['syringe']['scale'], None if s['blurred'] else s['scale'])
        compare('/syringe/capacity_ml', label['syringe']['capacity_ml'], None if s['blurred'] else s['capacity'])
        compare('/syringe/brand', label['syringe']['brand'], None if s['blurred'] else s['brand'])
        compare('/vial/substance', label['vial']['substance'], None if s['bad'] else s['substance'])
        compare('/vial/total_amount/value', label['vial']['total_amount']['value'], None if s['bad'] else s['total'])
        compare('/vial/concentration/value', label['vial']['concentration']['value'], None if s['bad'] else s['concentration'])
        f = args.store/r['file']
        compare('/image_sha256', label['image_sha256'], hashlib.sha256(f.read_bytes()).hexdigest())
        with Image.open(f) as im:
            compare('/pixel_dimensions', list(im.size), [1500, 1000])
            compare('/metadata/exif_present', bool(im.getexif()), False)
            # Compare an interior stopper sample with a nearby clear barrel sample.
            # This detects missing/misplaced geometry independent of JSON label fill.
            if not s['bad']:
                angle = label['conditions']['angle']
                width = round(1050*math.cos(math.radians(0 if angle == 'straight' else int(angle))))
                origin = 40+(1050-width)//2
                x = round(origin+(s['edge_x']+9)*width/1050)
                clear = round(origin+(s['edge_x']+35 if ml < s['capacity']*.8 else s['edge_x']-35)*width/1050)
                dark = sum(im.getpixel((x, 500))[:3])
                light = sum(im.getpixel((clear, 500))[:3])
                compare('/pixels/stopper_contrast', light-dark > 90, True)
        checks.append(dict(id=r['id'], labelers=['generator-v1','geometry-check-v1'], disagreements=disagreements,
                           human_verification='pending-rodney'))
    failures = [c for c in checks if c['disagreements']]
    audit = dict(images=len(rows), labels_with_disagreements=len(failures),
                 agreement=(len(rows)-len(failures))/len(rows), status='automated-consistency-only', results=checks)
    (ROOT/'synthetic-review-audit.json').write_text(json.dumps(audit, indent=2)+'\n')
    dimensions = {
        'split': lambda r:r['split'], 'brand': lambda r:r['label']['syringe']['brand'] or 'unreadable',
        'configuration': lambda r: f"{scenes[r['id']]['scale']} / {scenes[r['id']]['capacity']:g} mL",
        'lighting': lambda r:r['label']['conditions']['lighting'][0], 'angle':lambda r:r['label']['conditions']['angle'],
        'expected_behavior':lambda r:r['expected_behavior'],
        'vial':lambda r:r['label']['vial']['substance'] or 'illegible',
    }
    lines = ['# Synthetic v1 coverage', '', '240 unique procedural scenes. All labels pending Rodney verification.',
             'Illustrative brand text is a proxy, not five real syringe product families. Counts overlap.', '',
             '| Dimension | Bucket | Development | Locked holdout | Total |', '| --- | --- | ---: | ---: | ---: |']
    for dimension, extract in dimensions.items():
        for bucket in sorted(set(map(extract, rows))):
            dev = sum(extract(r)==bucket and r['split']=='development' for r in rows)
            hold = sum(extract(r)==bucket and r['split']=='holdout' for r in rows)
            lines.append(f'| {dimension} | {bucket} | {dev} | {hold} | {dev+hold} |')
    lines.extend(['', '## Configuration by illustrative brand (all scenes)', '', '| Scale / capacity | '+' | '.join(['BD','B. Braun','Terumo','Nipro','EasyTouch'])+' |', '| --- | ---: | ---: | ---: | ---: | ---: |'])
    for config in sorted(set(dimensions['configuration'](r) for r in rows)):
        counts = [sum(dimensions['configuration'](r)==config and scenes[r['id']]['brand']==brand for r in rows) for brand in ['BD','B. Braun','Terumo','Nipro','EasyTouch']]
        lines.append(f'| {config} | '+' | '.join(map(str,counts))+' |')
    lines.extend(['', 'Each configuration has 30 scenes (24 development, 6 holdout). Each brand session stays in one split.',
                  '40 unreadable scenes (20 blurred, 20 occluded); all 240 scenes include a vial, 200 labels readable.',
                  '120 peptide and 120 testosterone scenes, including unreadable labels. Fill: empty, near-empty, middle, near-full, one-third, obscured.',
                  f'Automated checker agreement: {len(rows)-len(failures)}/{len(rows)}. This is consistency, not independent human agreement.',
                  'No prompt tuning or holdout model calls were performed. Public lock is an audit record, not an access-control boundary.', ''])
    (ROOT/'COVERAGE.md').write_text('\n'.join(lines))
    print(f'Automated second pass: {len(rows)} images, {len(failures)} disagreements; human review pending.')
    if failures:
        print(json.dumps(failures[:3], indent=2))
        raise SystemExit(1)

if __name__ == '__main__':
    main()
