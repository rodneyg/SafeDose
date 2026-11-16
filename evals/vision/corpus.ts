import type { EvalLabel } from './harness';

export interface CorpusLabel {
  schema_version: 1;
  image_id: string;
  image_sha256: string;
  split: 'development' | 'holdout';
  syringe: NonNullable<EvalLabel['syringe']> & { gradation: { value: number | null; unit: string | null } };
  fill: NonNullable<EvalLabel['fill']> & { empty: boolean | null };
  vial: { substance: string | null; total_amount: { value: number | null; unit: string | null }; concentration: { value: number | null; unit: string | null }; label_legible: boolean | null };
  conditions: { lighting: string[]; angle: string; background: string; focus: string; occlusion: string };
  expected_behavior: 'read' | 'refuse';
  reason: string;
  review: { status: string; labelers: string[]; disagreements: unknown[]; adjudicator: string | null };
}
export interface CorpusEntry {
  id: string; file: string; sha256: string; label_file: string; group: string;
  split: CorpusLabel['split']; verified_by: string; expected_behavior: 'read' | 'refuse';
  source: { kind: string; generator: string; version: number }; license: string; notes: string;
  label: CorpusLabel;
}

/** Only structural adaptation. No predictions or dose values are derived from truth. */
export function adaptCorpusEntry(entry: CorpusEntry): EvalLabel {
  const label = entry.label;
  if (entry.id !== label.image_id || entry.sha256 !== label.image_sha256 || entry.split !== label.split || entry.expected_behavior !== label.expected_behavior) {
    throw new Error('Corpus inventory and strict label disagree');
  }
  return {
    id: entry.id, file: entry.file, sha256: entry.sha256, group: entry.group,
    split: label.split, verified_by: entry.verified_by,
    review: { status: label.review.status, reviewer: label.review.labelers.join(', ') },
    expected_behavior: label.expected_behavior,
    syringe: label.syringe, fill: label.fill,
    vial: { substance: label.vial.substance, total_amount: label.vial.total_amount.value,
      total_unit: label.vial.total_amount.unit, concentration: label.vial.concentration.value,
      concentration_unit: label.vial.concentration.unit },
    conditions: { lighting: label.conditions.lighting.join('+'), angle: label.conditions.angle },
  };
}

/** Deterministic round-robin across configurations, without ever selecting locked holdout. */
export function selectDevelopment(entries: EvalLabel[], limit: number): EvalLabel[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('Live limit must be 1..20');
  const buckets = new Map<string, EvalLabel[]>();
  for (const entry of entries) {
    if (entry.split !== 'development') continue;
    const key = `${entry.syringe?.scale}:${entry.syringe?.capacity_ml}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry); buckets.set(key, bucket);
  }
  const result: EvalLabel[] = [];
  for (let i = 0; result.length < limit; i++) {
    let added = false;
    for (const bucket of buckets.values()) if (bucket[i] && result.length < limit) {
      result.push(bucket[i]); added = true;
    }
    if (!added) break;
  }
  return result;
}
