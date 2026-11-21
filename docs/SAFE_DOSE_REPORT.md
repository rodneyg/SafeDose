# SafeDose repository report

This first-slice report describes only behavior present in this repository at commit `3b70b3b`. It is not a clinical evaluation, a statement of regulatory status, or a revenue forecast.

## What the app does

The calculator uses a user-entered dose and medication strength to calculate a liquid volume and syringe marking. Users can enter vial and syringe details manually. The app also includes a [reconstitution planner](../app/reconstitution.tsx) and [dose logging with local storage](../lib/hooks/useDoseLogging.ts).

## Computer vision pipeline

1. A user supplies a vial or syringe photo in the dose flow. The client sends a data URL to `POST /api/analyze-scan`; the OpenAI credential remains on the server. If the service is unavailable, the client directs the user to manual entry. See [`lib/scan/completeOnServer.ts`](../lib/scan/completeOnServer.ts) and [`api/analyze-scan.js`](../api/analyze-scan.js).
2. The API accepts JPEG, PNG, WebP, or GIF data URLs up to 4 MB. It applies origin checks and a best-effort, in-memory IP limit before making the provider request. See [`api/analyze-scan.js`](../api/analyze-scan.js) and the documented [abuse-protection limits](../api/SCAN_ABUSE_PROTECTION.md).
3. The provider request uses the pinned `gpt-4o-2024-08-06` model with temperature 0 and JSON-object output. Its prompt asks for visible syringe, vial, and fill fields, explicit confidence values, and refusal rather than inferred or ambiguous information. It explicitly says never to calculate a treatment dose. See [`lib/scan/request.js`](../lib/scan/request.js).
4. The shared parser validates the returned JSON. It requires supported syringe metadata, explicit quantity units, consistent markings, and confidence of at least 0.90 for populated fields. Unreadable, contradictory, unsupported, low-confidence, or model-refused results become `needs-input`. See [`lib/scan/index.ts`](../lib/scan/index.ts).
5. Only validated syringe and vial label fields can prefill calculation inputs. A model's observed fill is retained for evaluation but is never used as a dose input. Even a fully accepted scan remains `needs-verification` until the user confirms the syringe and vial. See [`lib/scan/index.ts`](../lib/scan/index.ts).
6. The calculation runs separately from computer vision, using the prescribed dose and verified inputs. It rejects missing or unsupported syringe details, invalid concentration, volume over the selected syringe capacity, and other explicit input constraints. See [`lib/dosing/calculateDose.ts`](../lib/dosing/calculateDose.ts).

## Guardrails present in the repository

- **Human confirmation:** Scan output cannot become calculation-ready until the user verifies the syringe and vial.
- **Fail-closed parsing:** Missing confidence, invalid JSON, unreadable units, contradictory scales, and unsupported cases produce reasons and require input instead of silently filling values.
- **No scanned-fill dosing:** The model's fill estimate is not mapped into dose inputs.
- **No dose recommendation in the vision prompt:** The scan request is limited to reading visible details and tells the model not to calculate a treatment dose.
- **Manual fallback:** Scan transport and provider failures produce a manual-entry path.
- **Server-side credential boundary:** The OpenAI key is read by the API route, not bundled into the client.
- **Request controls:** The route validates method, browser origin, image type, encoded size, and a per-instance request window. The rate limit is explicitly best effort, not a global spend cap or authentication system.
- **Deterministic calculation checks:** The calculation module validates required inputs, supported units and syringe metadata, and capacity before returning a marking.

These controls reduce particular failure modes. The repository does not establish that they eliminate all errors or make the output suitable for unverified use.

## Product and medical boundaries

SafeDose describes itself as a verification and calculation tool for injectable medication already prescribed by a healthcare provider. The repository says it does not diagnose conditions, recommend dosages, provide medical advice, or replace professional judgment. Users are told to follow the prescription, confirm the materials and calculation, and independently verify results. See the [README disclaimer](../README.md#%EF%B8%8F-disclaimer).

The current implementation reads label and syringe details, accepts manual inputs, performs unit conversions, and can log results. It must not be described from this repository alone as validating a prescription, identifying every unsafe situation, or proving a clinical outcome. The report also makes no claim about regulatory approval or medical-device status beyond the repository's own stated boundary.

## Existing prices and revenue boundary

The repository defines the following USD Photo Check offers:

| Offer | Listed price | Repository source |
| --- | ---: | --- |
| Monthly | $2.99 per month | [`lib/plans.js`](../lib/plans.js) |
| Annual | $26.99 per year | [`lib/plans.js`](../lib/plans.js) |

The calculator is described as free. Guest and unpaid accounts receive three photo scans per month, while the paid Photo Check plan uses an unlimited scan limit in application logic. Checkout is handled through Stripe. See [`app/pricing.tsx`](../app/pricing.tsx), [`lib/plans.js`](../lib/plans.js), and [`lib/photoCheckStripe.js`](../lib/photoCheckStripe.js).

Prices and plan behavior are product configuration, not revenue. This repository contains no verified sales, subscriber, conversion, refund, cost, margin, or recognized-revenue totals. Therefore this report does not calculate or estimate revenue. A revenue analysis would require dated billing and accounting data outside the repository, plus clear definitions for gross receipts, refunds, fees, taxes, and recognition period.
