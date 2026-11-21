import { buildScanRequest, mapScanToDoseInputs, parseScanModelOutput, parseScanQuantity, readScan, SCAN_MODEL, SCAN_MIN_CONFIDENCE } from '..';
import fixtures from '../../../evals/vision/fixtures/model-outputs.json';

const output = () => JSON.parse(JSON.stringify(fixtures[0].model_output));
const parse = (value: unknown) => parseScanModelOutput(JSON.stringify(value));

describe('shared scan boundary', () => {
  it('pins the same model, JSON format, prompt, and temperature for all transports', async () => {
    const complete = jest.fn(async () => JSON.stringify(output()));
    const scan = await readScan('data:image/jpeg;base64,example', { complete });
    expect(complete).toHaveBeenCalledWith(buildScanRequest('data:image/jpeg;base64,example'));
    expect(complete.mock.calls).toHaveLength(1);
    expect(buildScanRequest('image')).toMatchObject({ model: SCAN_MODEL, temperature: 0, response_format: { type: 'json_object' } });
    expect(scan.refuse).toBe(false);
  });
  it('replays offline without touching a provided network transport', async () => {
    const complete = jest.fn();
    expect((await readScan('', { modelOutput: JSON.stringify(output()), complete })).refuse).toBe(false);
    expect(complete).not.toHaveBeenCalled();
    await expect(readScan('', {})).rejects.toThrow('requires');
  });
  it('preserves legacy fields and maps explicit unit-bearing quantities', () => {
    const scan = parse(output());
    expect(scan.syringe).toMatchObject({ type: 'Insulin', volume: '1 ml', scale: 'U-100', capacity_ml: 1 });
    expect(mapScanToDoseInputs(scan)).toEqual({ status: 'needs-verification', reasons: [], inputs: {
      manualSyringe: { type: 'Insulin', volume: '1 ml' }, substance: 'Example compound',
      concentration: 10, concentrationUnit: 'mg/ml', totalAmount: null, totalAmountUnit: null,
    } });
    expect(mapScanToDoseInputs(scan, { syringeAndVialVerified: true }).status).toBe('ready');
  });
  it.each(['not json', 'null', '[]', '{}', '{"syringe":"Insulin"}'])('refuses malformed/incomplete content %s', raw => {
    expect(parseScanModelOutput(raw).refuse).toBe(true);
    expect(parseScanModelOutput(raw).raw).toBe(raw);
  });
  it('accepts a JSON fence without accepting surrounding prose', () => {
    expect(parseScanModelOutput('```json\n' + JSON.stringify(output()) + '\n```').refuse).toBe(false);
    expect(parseScanModelOutput('Here it is: ' + JSON.stringify(output())).refuse).toBe(true);
  });
  it.each(['fixture-unreadable', 'fixture-garbled-scale', 'fixture-reversed-scale', 'fixture-low-confidence', 'fixture-u40', 'fixture-model-refusal'])('%s refuses', id => {
    const fixture = fixtures.find(f => f.label.id === id)!;
    const scan = parse(fixture.model_output);
    expect(scan.refuse).toBe(true);
    expect(mapScanToDoseInputs(scan, { syringeAndVialVerified: true }).status).toBe('needs-input');
  });
  it('does not snap a between-marks fill', () => {
    const scan = parse(fixtures.find(f => f.label.id === 'fixture-between-marks')!.model_output);
    expect(scan.refuse).toBe(false);
    expect(scan.fill).toEqual({ units: 27.5, ml: 0.275, plunger_visible: true });
  });
  it('a missing vial unit requests input without inventing mg or units', () => {
    const scan = parse(fixtures.find(f => f.label.id === 'fixture-missing-vial-unit')!.model_output);
    const mapped = mapScanToDoseInputs(scan);
    expect(mapped.status).toBe('needs-input');
    expect(mapped.inputs.concentration).toBeNull();
    expect(mapped.inputs.concentrationUnit).toBeNull();
  });
  it('requires confidence at the documented boundary for every populated field', () => {
    for (const key of Object.keys(output().confidence)) {
      const o = output();
      if (['vial.totalAmount', 'vial.expiration'].includes(key)) o.vial[key.split('.')[1]] = key === 'vial.totalAmount' ? '5 mg' : '2027-01-01';
      o.confidence[key] = SCAN_MIN_CONFIDENCE;
      expect(parse(o).refuse).toBe(false);
      o.confidence[key] = SCAN_MIN_CONFIDENCE - 0.001;
      expect(parse(o).refuse).toBe(true);
      delete o.confidence[key];
      expect(parse(o).refuse).toBe(true);
    }
  });
  it.each([NaN, Infinity, -1, 1.1, '0.99'])('rejects invalid confidence %s', confidence => {
    const o = output(); o.confidence['syringe.type'] = confidence;
    expect(parse(o).refuse).toBe(true);
  });
  it('refuses contradictory, over-capacity, or invisible fill readings', () => {
    for (const change of [{ ml: 0.4 }, { units: 125, ml: 1.25 }, { plunger_visible: false }, { ml: -1 }, { units: '25' }, { units: null, ml: null }]) {
      const o = output(); Object.assign(o.fill, change);
      expect(parse(o).refuse).toBe(true);
    }
  });
  it('never guesses a supported capacity or scale', () => {
    for (const change of [{ type: null }, { scale: null }, { scale: 'unknown' }, { scale: 'mL' }, { volume: '1' }, { volume: '2 ml' }, { markings: '0,200' }]) {
      const o = output(); Object.assign(o.syringe, change);
      expect(mapScanToDoseInputs(parse(o)).status).toBe('needs-input');
    }
  });
  // Syringe fields from development-only T-1150 validation outputs. Keep the
  // existing vial and fill fixture so only the syringe determines the outcome.
  const insulin = { type: 'Insulin', scale: 'U-100', volume: '0.5 ml', markings: '0,10,20,30,40,50' }; // c1-b0-s1
  const largeMarks = '0,20,40,60,80,100'; // c2-b0-s1
  it.each([
    ['missing capacity', { ...insulin, volume: null }],
    ['markings below reported capacity', { ...insulin, volume: '1 ml' }],
    ['markings above reported capacity', { ...insulin, markings: largeMarks }],
    ['type conflicts with scale', { ...insulin, type: 'Standard' }],
    ['scale conflicts with type', { ...insulin, scale: 'mL' }],
    ['standard scale contains implausible markings', {
      type: 'Standard', scale: 'mL', volume: '5 ml', markings: '0,0.5,1,5,10,20,30,40,50', // c7-b1-s3
    }],
  ])('withholds the syringe even after review for %s', (_label, syringe) => {
    const o = output();
    o.syringe = syringe;
    const scan = parse(o);
    const mapped = mapScanToDoseInputs(scan, { syringeAndVialVerified: true });
    expect(mapped.status).toBe('needs-input');
    expect(mapped.inputs.manualSyringe).toBeNull();
    expect(mapped.reasons).toContain('Check the syringe label and select its capacity manually.');
  });
  it('keeps the existing verification step when development markings corroborate the capacity', () => {
    const o = output();
    o.syringe = insulin;
    const scan = parse(o);
    expect(mapScanToDoseInputs(scan).status).toBe('needs-verification');
    expect(mapScanToDoseInputs(scan, { syringeAndVialVerified: true })).toMatchObject({
      status: 'ready',
      inputs: { manualSyringe: { type: 'Insulin', volume: '0.5 ml' } },
    });
  });
  it('does not apply an amount in different units to the calculator', () => {
    const o = output(); o.vial.totalAmount = '1000 mcg';
    expect(mapScanToDoseInputs(parse(o)).status).toBe('needs-input');
  });
  it('a model refusal recommendation cannot be overwritten by confidence', () => {
    const o = output(); o.expected_behavior = 'refuse';
    expect(parse(o).refuse).toBe(true);
    delete o.expected_behavior; delete o.refuse;
    expect(parse(o).refuse).toBe(true);
  });
  it.each(['10', '10mg junk', '1,0 mg', 'Infinity mg', '-5 mg', '0 mg', '5 mg/2ml'])('does not coerce ambiguous quantity %s', value => {
    expect(parseScanQuantity(value)).toBeNull();
  });
  it.each([['100 IU/ml', 'units'], ['5 USP units/ml', 'units'], ['10 µg/ml', 'mcg']])('normalizes explicit unit alias %s only', (value, unit) => {
    expect(parseScanQuantity(value, true)?.unit).toBe(unit);
  });
});

 describe('SAF-109 unknown math inputs', () => {
  it.each(['unreadable', null, 'garbled'])('never defaults required syringe/vial fields: %s', value => {
    for (const field of ['type', 'volume', 'scale', 'markings']) {
      const o = output(); o.syringe[field] = value;
      expect(mapScanToDoseInputs(parse(o)).status).toBe('needs-input');
    }
    const o = output(); o.vial.concentration = value; o.vial.totalAmount = null;
    const mapped = mapScanToDoseInputs(parse(o));
    expect(mapped.status).toBe('needs-input');
    expect(mapped.inputs.concentration).toBeNull();
  });
  it('low confidence quantities and syringes are unknown to prefill', () => {
    const o = output(); o.confidence['vial.concentration'] = 0.89;
    o.confidence['syringe.capacity_ml'] = 0.89;
    const mapped = mapScanToDoseInputs(parse(o));
    expect(mapped.status).toBe('needs-input');
    expect(mapped.inputs.concentration).toBeNull();
    expect(mapped.inputs.manualSyringe).toBeNull();
  });
});
