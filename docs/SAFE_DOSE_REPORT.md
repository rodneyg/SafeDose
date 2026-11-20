# SafeDose code report

This report describes the current code.

## What the app does

SafeDose accepts a dose and medication strength from the user.
It calculates a liquid volume and a syringe marking.
It also has a reconstitution planner and on-device dose logs.
Users can enter label and syringe values by hand.

## CV scan pipeline

The client sends a photo data URL to `/api/analyze-scan`.
The server checks the request origin, rate limit, image type, and image size.
The server sends the image and a fixed prompt to a pinned vision model.
The model is asked for JSON with syringe, vial, fill, and confidence fields.
The client parses that JSON with strict field and unit rules.
Populated fields need confidence of at least 0.90.
Rejected or incomplete scans return a needs-input result.
The user can then enter or confirm values manually.

## Dose guardrails

Inputs must be positive finite numbers with supported units.
Dose and concentration units must be compatible.
The calculator converts between mg and mcg when the units allow it.
It uses exact decimal arithmetic before display rounding.
It blocks volumes below 0.005 mL or above 2 mL.
It blocks volumes above the selected syringe capacity.
It blocks a dose above the total amount entered for the vial.
Scanned vial amounts must include an explicit supported unit.
Scanned syringe facts must pass confidence and consistency checks.
Unreadable, contradictory, or unsupported scan data needs manual input.

## What the app does not do

The vision prompt does not ask the model to calculate a treatment dose.
The scan parser does not infer missing units.
It does not accept low-confidence fields as dose inputs.
It does not accept every syringe size or insulin scale.
The calculator does not choose the user's dose.

## Plan gates

The manual calculator stays available on the free plan.
The reconstitution planner and on-device logs also stay available.
Free and anonymous plans receive three photo scans per calendar month.
Recognized paid photo-check and legacy paid plans have no photo-scan cap.
The usage check reads the stored plan before allowing another scan.
The scan count increases after a scan is used.
