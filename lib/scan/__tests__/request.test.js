const { buildScanRequest, SCAN_PROMPT } = require('../request');

describe('buildScanRequest', () => {
  it.each([
    ['a data URL', 'data:image/jpeg;base64,YWJjZA=='],
    ['an HTTPS URL', 'https://example.test/photo.jpg?width=320&height=240'],
  ])('builds the scan request with %s', (_description, image) => {
    expect(buildScanRequest(image)).toEqual({
      model: 'gpt-6-luna',
      reasoning_effort: 'none',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_PROMPT },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
    });
  });

  it('gives the model a valid JSON example that defaults to refusal', () => {
    const example = SCAN_PROMPT.split('\n').find(line => line.startsWith('{'));
    const output = JSON.parse(example);

    expect(output).toMatchObject({
      syringe: {
        type: expect.any(String),
        volume: expect.any(String),
        markings: expect.any(String),
        scale: expect.any(String),
      },
      vial: { substance: null, totalAmount: null, concentration: null, expiration: null },
      fill: { units: null, ml: null, plunger_visible: null },
      refuse: true,
      refuse_reason: null,
    });
    expect(Object.keys(output.confidence).sort()).toEqual([
      'fill.ml',
      'fill.plunger_visible',
      'fill.units',
      'syringe.capacity_ml',
      'syringe.markings',
      'syringe.scale',
      'syringe.type',
      'vial.concentration',
      'vial.expiration',
      'vial.substance',
      'vial.totalAmount',
    ]);
    expect(Object.values(output.confidence).every(value => value === 0)).toBe(true);
    expect(SCAN_PROMPT).toContain('Never calculate a treatment dose.');
  });
});
