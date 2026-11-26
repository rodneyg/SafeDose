// Shared scan-model request. CommonJS so the Vercel API route can require it
// without bundling a TypeScript module. Keep in sync via re-exports in index.ts.
const SCAN_MODEL = 'gpt-6-luna';
const SCAN_PROMPT = `Analyze the image for syringe and vial details. Return ONLY a valid JSON object:
{"syringe":{"type":"Insulin | Standard | unreadable | null","volume":"1 ml | 0.5 ml | unreadable | null","markings":"comma-separated visible numeric marks | unreadable | null","scale":"U-100 | U-40 | mL | unknown | null"},"vial":{"substance":null,"totalAmount":null,"concentration":null,"expiration":null},"fill":{"units":null,"ml":null,"plunger_visible":null},"confidence":{"syringe.type":0,"syringe.capacity_ml":0,"syringe.scale":0,"syringe.markings":0,"fill.units":0,"fill.ml":0,"fill.plunger_visible":0,"vial.substance":0,"vial.totalAmount":0,"vial.concentration":0,"vial.expiration":0},"refuse":true,"refuse_reason":null}
Keep the existing syringe type/volume/markings and vial substance/totalAmount/concentration/expiration fields.
Use null only for absent/not visible information; use "unreadable" for present but illegible text.
Copy vial values WITH explicit printed units (e.g. "20 mg", "100 units/ml", "10 mg/ml"). Never infer a missing unit, syringe type, capacity, or scale. Do not infer U-100 from appearance or medication concentration.
Read fill from the leading plunger edge nearest the needle, including between-marks values without snapping. Set plunger_visible false if hidden. Fill units are syringe scale units, not medication units. Supply mL only if the scale establishes the conversion.
Confidence is a number from 0 to 1 for EACH populated field, including plunger visibility; use 0 for absent fields.
Set refuse true for unreadable fields, unknown scale, confidence below 0.90, hidden plunger when estimating fill, garbled/reversed/inconsistent scales, contradictory labels, unsupported U-40 conversion, unsafe/ambiguous or implausible/AI-generated details. Recommend refusal rather than inventing information. Set refuse_reason to a brief reason. Never calculate a treatment dose.`;

function buildScanRequest(image) {

  return {
    model: SCAN_MODEL,
    reasoning_effort: 'none',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: [
      { type: 'text', text: SCAN_PROMPT },
      { type: 'image_url', image_url: { url: image } },
    ] }],
  };
}

module.exports = { SCAN_MODEL, SCAN_PROMPT, buildScanRequest };
