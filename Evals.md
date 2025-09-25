# SafeDose Evaluation Framework

## Purpose

This evaluation framework enables contributors to systematically measure and improve SafeDose's accuracy across its core functionality. The framework establishes:

- **Trust**: Transparent, reproducible testing methods
- **Reproducibility**: Standardized evaluation format and process  
- **Performance Benchmarks**: Clear metrics for dose calculation and AI scanning accuracy

## Method

Each evaluation consists of three components:

```
{
  "image": "path/to/test_image.jpg",
  "prompt": "Calculate dose for 2.5 mg Semaglutide",
  "expected_output": {
    "calculatedVolume": 0.25,
    "recommendedMarking": "0.25 ml",
    "syringeType": "Standard 1ml",
    "calculationError": null
  }
}
```

## Process

### 1. Identify Model Failure Modes
Common areas where SafeDose may struggle:
- **Unit Conversions**: mg to mcg, units to ml
- **Syringe Recognition**: Different syringe types and markings
- **Vial Text Extraction**: Concentration reading from labels
- **Edge Cases**: Very small/large doses, unusual concentrations
- **Multi-step Calculations**: Reconstitution scenarios

### 2. Build Targeted Evaluations
Create specific test cases for each failure mode:
- Gather representative images of syringes, vials, labels
- Define clear input prompts matching user scenarios
- Establish ground truth expected outputs
- Include both positive and negative test cases

### 3. Run SafeDose Against Evaluation Set
Execute evaluations using:
```bash
# Example evaluation runner (to be implemented)
npm run eval -- --test-set basic-dose-calculations
npm run eval -- --test-set syringe-recognition  
npm run eval -- --test-set unit-conversions
```

### 4. Compare Outputs vs Expected
Measure accuracy using:
- **Dose Calculation Accuracy**: Exact match for calculated volumes
- **Syringe Recognition Accuracy**: Correct syringe type identification
- **Text Extraction Accuracy**: Precise concentration reading
- **Error Handling**: Appropriate error messages for invalid inputs

### 5. Iterate with Improvements
Based on results:
- Adjust prompt engineering
- Improve context handling
- Fine-tune model parameters
- Enhance preprocessing steps

## Evaluation Categories

### Basic Dose Calculations
Test core mathematical accuracy across common scenarios.

**Example Evaluation:**
```json
{
  "id": "basic-001",
  "category": "dose-calculation",
  "description": "Standard mg to ml conversion",
  "image": null,
  "prompt": "Calculate dose: 2.5 mg Semaglutide, 10mg/ml concentration, using 1ml syringe",
  "expected_output": {
    "calculatedVolume": 0.25,
    "recommendedMarking": "0.25 ml",
    "calculationError": null
  }
}
```

### Syringe Recognition
Evaluate AI's ability to identify syringe types and markings from images.

**Example Evaluation:**
```json
{
  "id": "syringe-001", 
  "category": "syringe-recognition",
  "description": "Standard 1ml syringe identification",
  "image": "evals/images/1ml_syringe_standard.jpg",
  "prompt": "Identify this syringe type and volume",
  "expected_output": {
    "syringeType": "Standard",
    "syringeVolume": "1 ml",
    "confidence": "> 0.8"
  }
}
```

### Unit Conversions
Test accuracy across different unit combinations.

**Example Evaluation:**
```json
{
  "id": "units-001",
  "category": "unit-conversion", 
  "description": "mg to mcg conversion",
  "image": null,
  "prompt": "Calculate dose: 500 mcg medication, 1 mg/ml concentration",
  "expected_output": {
    "calculatedVolume": 0.5,
    "recommendedMarking": "0.5 ml",
    "calculationError": null
  }
}
```

### Error Handling
Validate appropriate error messages for invalid scenarios.

**Example Evaluation:**
```json
{
  "id": "error-001",
  "category": "error-handling",
  "description": "Volume below safe threshold",
  "image": null, 
  "prompt": "Calculate dose: 0.01 mg medication, 100 mg/ml concentration",
  "expected_output": {
    "calculatedVolume": 0.0001,
    "calculationError": "VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.",
    "recommendedMarking": null
  }
}
```

### Reconstitution Scenarios
Test complex multi-step calculations for peptide reconstitution.

**Example Evaluation:**
```json
{
  "id": "recon-001",
  "category": "reconstitution",
  "description": "Basic peptide reconstitution",
  "image": "evals/images/semaglutide_vial_5mg.jpg",
  "prompt": "Reconstitute 5mg Semaglutide vial with 2ml BAC water for 0.5mg dose",
  "expected_output": {
    "finalConcentration": 2.5,
    "injectionVolume": 0.2,
    "bacWaterToAdd": 2.0,
    "calculationError": null
  }
}
```

## Contribution Guidelines

### Adding New Evaluations

1. **Identify Gap**: Find areas lacking test coverage
2. **Create Test Case**: Follow the standard format above
3. **Add Images**: Place test images in `evals/images/` directory
4. **Document Expected Output**: Be precise with expected values
5. **Submit PR**: Include rationale for the new evaluation

### Image Guidelines

- **Format**: JPG or PNG
- **Resolution**: Minimum 800x600 for clear recognition
- **Lighting**: Well-lit, minimal shadows
- **Focus**: Clear, sharp images of medical supplies
- **Privacy**: No personal information visible

### Sharing Results

Document evaluation runs in `evals/results/` with:
- Timestamp
- SafeDose version tested
- Pass/fail rates by category
- Specific failure analysis
- Recommended improvements

## Community Hill-Climbing

### Collaborative Improvement Process

1. **Regular Evaluation Runs**: Weekly automated testing
2. **Community Challenges**: Monthly focus areas for improvement
3. **Benchmark Tracking**: Monitor accuracy trends over time
4. **Best Practice Sharing**: Document successful prompt patterns
5. **Open Results**: Transparent performance metrics

### Getting Started

To contribute to SafeDose evaluation:

1. Review existing evaluations in `evals/` directory
2. Run current evaluation suite to understand baseline
3. Identify areas for improvement based on results
4. Add targeted evaluations for weak spots
5. Share findings with the community

### Success Metrics

Target benchmarks for SafeDose accuracy:
- **Dose Calculations**: >99% accuracy for standard scenarios
- **Syringe Recognition**: >95% accuracy for common syringe types  
- **Unit Conversions**: >99% accuracy for supported unit pairs
- **Error Detection**: >90% accuracy for unsafe dose scenarios

---

*This framework evolves based on community contributions and real-world usage patterns. Help us make SafeDose safer and more reliable for everyone.*