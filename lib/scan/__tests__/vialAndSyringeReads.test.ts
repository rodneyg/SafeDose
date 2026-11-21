import { mapScanToDoseInputs, parseScanModelOutput, readScan } from '..';

const syntheticRead = () => ({
  syringe: {
    type: 'Insulin',
    volume: '1 ml',
    markings: '0,10,20,30,40,50,60,70,80,90,100',
    scale: 'U-100',
  },
  vial: {
    substance: 'Synthetic medicine',
    totalAmount: '10 mg',
    concentration: '5 mg/ml',
    expiration: null,
  },
  fill: { units: 20, ml: 0.2, plunger_visible: true },
  confidence: {
    'syringe.type': 0.99,
    'syringe.capacity_ml': 0.99,
    'syringe.scale': 0.99,
    'syringe.markings': 0.99,
    'vial.substance': 0.99,
    'vial.totalAmount': 0.99,
    'vial.concentration': 0.99,
    'fill.units': 0.99,
    'fill.ml': 0.99,
    'fill.plunger_visible': 0.99,
  },
  refuse: false,
});

const parse = (fixture: ReturnType<typeof syntheticRead>) =>
  parseScanModelOutput(JSON.stringify(fixture));

describe('vial and syringe read regressions', () => {
  it('maps successful synthetic vial and syringe reads after verification', () => {
    const mapped = mapScanToDoseInputs(parse(syntheticRead()), { syringeAndVialVerified: true });

    expect(mapped).toMatchObject({
      status: 'ready',
      reasons: [],
      inputs: {
        manualSyringe: { type: 'Insulin', volume: '1 ml' },
        substance: 'Synthetic medicine',
        concentration: 5,
        concentrationUnit: 'mg/ml',
        totalAmount: 10,
        totalAmountUnit: 'mg',
      },
    });
  });

  it.each([
    ['vial', 'vial.concentration', 'concentration'],
    ['syringe', 'syringe.capacity_ml', 'manualSyringe'],
  ] as const)('withholds a low-confidence %s read', (_label, confidenceKey, inputKey) => {
    const fixture = syntheticRead();
    fixture.confidence[confidenceKey] = 0.89;

    const mapped = mapScanToDoseInputs(parse(fixture), { syringeAndVialVerified: true });

    expect(mapped.status).toBe('needs-input');
    expect(mapped.inputs[inputKey]).toBeNull();
    expect(mapped.reasons).toContain(`Low or missing confidence: ${confidenceKey}.`);
  });

  it.each([
    ['vial', (fixture: ReturnType<typeof syntheticRead>) => { fixture.vial.concentration = '5'; }],
    ['syringe', (fixture: ReturnType<typeof syntheticRead>) => { fixture.syringe.markings = '100,50,0'; }],
  ] as const)('refuses an invalid %s read', (_label, corrupt) => {
    const fixture = syntheticRead();
    corrupt(fixture);

    const scan = parse(fixture);

    expect(scan.refuse).toBe(true);
    expect(mapScanToDoseInputs(scan).status).toBe('needs-input');
  });

  it('propagates scanner transport errors without accepting a partial read', async () => {
    const failure = new Error('synthetic scanner failure');

    await expect(readScan('data:image/jpeg;base64,synthetic', {
      complete: jest.fn().mockRejectedValue(failure),
    })).rejects.toBe(failure);
  });
});
