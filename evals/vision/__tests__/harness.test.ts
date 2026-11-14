import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseScanModelOutput } from '../../../lib/scan';
import rawFixtures from '../fixtures/model-outputs.json';
import thresholds from '../thresholds.json';
import { classifyResult, evaluateThresholds, loadImage, renderMarkdown, REPORT_HEADER, runDosePipeline, scoreScan, sha256, summarize, verifySha256, type Fixture } from '../harness';

const fixtures = rawFixtures as Fixture[];
function score(fixture: Fixture, source: 'synthetic' | 'not-evaluated' = 'synthetic') {
  return scoreScan(fixture.label, parseScanModelOutput(JSON.stringify(fixture.model_output)), {
    source, image_status: 'text-only-fixture', latency_ms: 1, cost_usd: 0,
  });
}

describe('vision eval full pipeline and gate', () => {
  it.each(['fixture-exact-read', 'fixture-standard-read', 'fixture-between-marks', 'fixture-total-amount'])('%s uses the production dose calculator with independently authored expected output', id => {
    const row = score(fixtures.find(f => f.label.id === id)!);
    expect(row.classification).toBe('exact-correct');
    expect(row.pipeline.got).toMatchObject(row.pipeline.expected!);
    expect(row.pipeline.status).toBe('number-shown');
  });
  it('shows a wrong number and fails the would-be zero-wrong-number gate', () => {
    const row = score(fixtures.find(f => f.label.id === 'fixture-wrong-number')!);
    expect(row.pipeline.got?.calculatedVolume).toBe(0.125);
    expect(row.pipeline.expected?.calculatedVolume).toBe(0.25);
    expect(row.classification).toBe('wrong-number-shown');
    const summary = summarize([row]);
    expect(evaluateThresholds(summary, thresholds).would_pass).toBe(false);
    expect(summary.wrong_number_cases).toEqual([{ id: row.id, sha256: row.sha256, sha256_kind: 'text-fixture', mismatches: row.mismatches }]);
  });
  it('a missing vial unit never reaches calculateDose', () => {
    const row = score(fixtures.find(f => f.label.id === 'fixture-missing-vial-unit')!);
    expect(row.classification).toBe('refused-or-asked');
    expect(row.pipeline.got).toBeNull();
  });
  it('does not leak expected_behavior into model acceptance', () => {
    const fixture = JSON.parse(JSON.stringify(fixtures[0])) as Fixture;
    fixture.label.expected_behavior = 'refuse';
    const row = score(fixture);
    expect(row.refused).toBe(false);
    expect(row.classification).toBe('wrong-number-shown');
  });
  it.each([
    [{ refused: false, asked: false, expectedBehavior: 'read' as const, mismatches: [] }, 'exact-correct'],
    [{ refused: true, asked: false, expectedBehavior: 'read' as const, mismatches: ['fill.ml'] }, 'refused-or-asked'],
    [{ refused: false, asked: true, expectedBehavior: 'refuse' as const, mismatches: [] }, 'refused-or-asked'],
    [{ refused: false, asked: false, expectedBehavior: 'read' as const, mismatches: ['fill.ml'] }, 'wrong-number-shown'],
  ])('assigns exactly one class', (input, expected) => { expect(classifyResult(input)).toBe(expected); });
  it('missing recordings are not counted as correct predictions or model refusals', () => {
    const rows = [score(fixtures[0]), score(fixtures[0], 'not-evaluated')];
    const summary = summarize(rows);
    expect(summary.observed).toBe(1);
    expect(summary.not_evaluated).toBe(1);
    expect(summary.refusal_rate).toBe(0);
    expect(summary.field_accuracy['fill.ml']).toEqual({ correct: 1, evaluated: 1, labeled: 2, accuracy: 1 });
    expect(rows[1].classification).toBe('refused-or-asked');
  });
  it('reports a missed approved threshold and uncaught syringe misses', () => {
    const row = score(fixtures[0]);
    row.got['syringe.capacity_ml'] = 0.5;
    const summary = summarize([row]);
    expect(summary.uncaught_syringe_misses).toBe(1);
    const gate = evaluateThresholds(summary, { ...thresholds, status: 'approved', approved_by: 'test-only' });
    expect(gate.would_pass).toBe(false);
    expect(gate.violations.some(v => v.includes('capacity_ml'))).toBe(true);
    expect(evaluateThresholds(summarize([]), thresholds)).toMatchObject({ would_pass: false, unassessed: ['syringe.type', 'syringe.capacity_ml'] });
  });
  it('the proposed gate passes exact reads without suggesting owner approval', () => {
    const summary = summarize([score(fixtures[0])]);
    expect(evaluateThresholds(summary, thresholds)).toMatchObject({ would_pass: true, status: 'pending-rodney' });
    const markdown = renderMarkdown(summary, evaluateThresholds(summary, thresholds), { mode: 'offline', commit: 'test', enforced: false, manifest_count: 111 });
    expect(markdown).toContain(REPORT_HEADER);
    expect(markdown).toContain('informational');
    for (const key of ['group', 'brand', 'lighting', 'angle']) expect(markdown).toContain(`By ${key}`);
  });
  it('asks when a dose context, solution volume, or concentration is incomplete', () => {
    const scan = parseScanModelOutput(JSON.stringify(fixtures.find(f => f.label.id === 'fixture-total-amount')!.model_output));
    const context = fixtures[0].label.dose!;
    expect(runDosePipeline(scan).status).toBe('no-dose-scenario');
    expect(runDosePipeline(scan, context).status).toBe('needs-solution-volume');
    expect(runDosePipeline(scan, { ...context, solutionVolume: '2junk' }).status).toBe('needs-solution-volume');
    expect(runDosePipeline(scan, { ...context, doseValue: Infinity }).status).toBe('invalid-dose-context');
  });
  it('uses exact equality for between-marks fills, without silently applying photo estimates', () => {
    const row = score(fixtures.find(f => f.label.id === 'fixture-between-marks')!);
    expect(row.expected['fill.ml']).toBe(0.275);
    expect(row.got['fill.ml']).toBe(0.275);
  });
  it('lets the real calculator derive concentration and enforce its derived-concentration guards', () => {
    const fixture = fixtures.find(f => f.label.id === 'fixture-total-amount')!;
    expect(score(fixture).pipeline.got?.calculatedConcentration).toBe(2.5);
    const output = JSON.parse(JSON.stringify(fixture.model_output));
    output.vial.totalAmount = '0.001 mg';
    const pipeline = runDosePipeline(parseScanModelOutput(JSON.stringify(output)), fixture.label.dose);
    expect(pipeline.status).toBe('calculator-asked');
    expect(pipeline.got?.calculationError).toContain('extremely low');
    expect(pipeline.got?.recommendedMarking).toBeNull();
  });
});

describe('local image identity', () => {
  // Tiny procedural PNG generated in a temp directory. No binary is committed.
  const pixels = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMV8AAAAASUVORK5CYII=', 'base64');
  let directory: string;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'saf107-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  it('checks a known SHA-256 vector and changed bytes', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(verifySha256(pixels, sha256(pixels))).toBe(true);
    expect(verifySha256(Buffer.from('changed'), sha256(pixels))).toBe(false);
  });
  it('loads verified pixels and fail-softs a mismatch or missing image', async () => {
    await mkdir(join(directory, 'images'));
    await writeFile(join(directory, 'images/test.png'), pixels);
    const label = { ...fixtures[0].label, file: 'images/test.png', sha256: sha256(pixels) };
    expect((await loadImage(directory, label)).status).toBe('verified');
    const mismatch = await loadImage(directory, { ...label, sha256: '0'.repeat(64) });
    expect(mismatch).toEqual({ status: 'sha256-mismatch', bytes: null });
    expect((await loadImage(directory, { ...label, file: 'images/absent.png' })).status).toBe('missing-image');
    expect((await loadImage(directory, { ...label, file: '../outside.png' })).status).toBe('invalid-path');
    await expect(loadImage(undefined, label)).rejects.toThrow('SAFEDOSE_EVAL_IMAGES_DIR');
  });
});
