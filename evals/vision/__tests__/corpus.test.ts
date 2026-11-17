import manifest from '../synthetic-manifest.json';
import lock from '../synthetic-split-lock.json';
import { adaptCorpusEntry, selectDevelopment, type CorpusEntry } from '../corpus';
const { checkCorpus } = require('../check-corpus');
const copy = (): CorpusEntry[] => JSON.parse(JSON.stringify(manifest));
const read = (file: string) => manifest.find(e => e.label_file === file)!.label;

describe('synthetic corpus integrity and production adapter', () => {
  it('keeps strict labels, unique image hashes and the complete session lock consistent', () => {
    expect(checkCorpus(manifest, lock)).toBe(240);
    expect(manifest.filter(r => r.split === 'holdout')).toHaveLength(48);
  });
  it('adapts quantities without deriving missing vial facts', () => {
    const e = copy()[0];
    const adapted = adaptCorpusEntry(e);
    expect(adapted.vial).toMatchObject({ total_amount: e.label.vial.total_amount.value, total_unit: 'mg', concentration: e.label.vial.concentration.value, concentration_unit: 'mg/mL' });
    e.label.vial.concentration = { value: null, unit: null };
    expect(adaptCorpusEntry(e).vial?.concentration).toBeNull();
  });
  it('rejects a label hash that differs from its inventory', () => {
    const e = copy()[0]; e.label.image_sha256 = 'f'.repeat(64);
    expect(() => adaptCorpusEntry(e)).toThrow('disagree');
  });
  it('detects a split change even when both copies of a label change together', () => {
    const data = copy(); data[0].split = 'development'; data[0].label.split = 'development';
    expect(() => checkCorpus(data, lock, (file: string) => data.find(r => r.label_file === file)!.label)).toThrow('Split lock changed');
  });
  it('rejects duplicate pixels and altered canonical labels', () => {
    const data = copy(); data[1].sha256 = data[0].sha256; data[1].label.image_sha256 = data[0].sha256;
    expect(() => checkCorpus(data, lock, read)).toThrow('Duplicate');
    const other = copy(); other[0].label.fill.ml = .1;
    expect(() => checkCorpus(other, lock, read)).toThrow();
  });
  it('chooses at most 20 development scenes and never selects locked holdout', () => {
    const all = copy().map(adaptCorpusEntry);
    const selected = selectDevelopment(all, 12);
    expect(selected).toHaveLength(12);
    expect(selected.every(r => r.split === 'development')).toBe(true);
    expect(new Set(selected.map(r => `${r.syringe?.scale}:${r.syringe?.capacity_ml}`)).size).toBeGreaterThanOrEqual(8);
    expect(selected.some(r => r.expected_behavior === 'refuse')).toBe(true);
    expect(() => selectDevelopment(all, 21)).toThrow();
    expect(() => selectDevelopment(all, NaN)).toThrow();
  });
});
