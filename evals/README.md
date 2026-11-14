# SafeDose Evaluation Framework

This directory contains the evaluation framework for testing and improving SafeDose accuracy.

## Directory Structure

```
evals/
├── README.md              # This file
├── test-sets/             # Evaluation test suites
├── vision/                # Shared-reader harness, pending labels, and text fixtures
└── results/               # Evaluation run results
```

## Test Sets

### Currently Available

- **basic-dose-calculations.json**: Core mathematical accuracy tests
- **error-handling.json**: Error detection and safety validation
- **unit-conversions.json**: Cross-unit calculation accuracy

### Planned Test Sets

- **syringe-recognition.json**: AI image recognition accuracy
- **vial-text-extraction.json**: Label reading and OCR accuracy
- **reconstitution-scenarios.json**: Complex multi-step calculations
- **edge-cases.json**: Unusual scenarios and boundary conditions

## Running Evaluations

### Automatic Data Collection

SafeDose now automatically captures user interactions to build evaluation datasets:

- Each dose calculation and AI scan is automatically saved
- Data includes input parameters, results, and quality scores
- High-quality interactions (score >= 0.6) can be exported for model training
- Privacy-focused: images stored locally, no personal data transmitted

**For complete instructions on using captured data to fine-tune models**, see the **[Model Fine-Tuning Guide](../docs/MODEL_FINE_TUNING_GUIDE.md)**.

#### Quick Export

```bash
# Export captured user interaction data
node scripts/export-evaluation-data.js

# Output files in evals/exported-data/:
# - evaluation-data-{timestamp}.json (full format)
# - training-data-{timestamp}.jsonl (OpenAI-ready format)
```

### Manual Testing
For now, evaluations can be tested manually against the SafeDose application:

1. Load a test set: `cat test-sets/basic-dose-calculations.json`
2. For each evaluation, input the prompt into SafeDose
3. Compare actual output with expected output
4. Record results in `results/` directory

### Automated dosing and vision checks

```bash
npm run test:dosing
npm run test:vision
npm run eval:vision -- --offline
```

See [Vision evals](vision/README.md) for the private image store, recorded-output replay, and live spend approval. The old `npm run eval -- --test-set ...` interface is not implemented. Labels and proposed accuracy thresholds remain pending Rodney verification. Offline synthetic fixtures do not establish photo accuracy.

## Contributing Test Cases

1. Identify gaps in current test coverage
2. Create new test cases following the standard format
3. Keep test pixels outside git; configure `SAFEDOSE_EVAL_IMAGES_DIR` as documented in `vision/README.md`
4. Submit PR with rationale for new evaluations

## Test Case Format

```json
{
  "id": "unique-identifier",
  "category": "test-category",
  "description": "Human-readable description",
  "image": "path/to/image.jpg or null",
  "prompt": "Input prompt for SafeDose",
  "expected_output": {
    "calculatedVolume": 0.25,
    "recommendedMarking": "0.25 ml",
    "calculationError": null
  }
}
```

## Results Tracking

Results should be documented in `results/` with format:
- `YYYY-MM-DD_HH-MM_evaluation-run.json`
- Include: timestamp, version, pass/fail rates, specific failures