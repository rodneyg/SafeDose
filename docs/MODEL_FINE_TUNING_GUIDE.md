# SafeDose Model Fine-Tuning Guide

This comprehensive guide explains how to use automatically captured user interaction data to fine-tune AI models for improved SafeDose accuracy, with specific instructions for OpenAI's platform.

## Table of Contents

1. [Overview](#overview)
2. [How Automatic Data Capture Works](#how-automatic-data-capture-works)
3. [Accessing Captured Data](#accessing-captured-data)
4. [Preparing Data for Fine-Tuning](#preparing-data-for-fine-tuning)
5. [Fine-Tuning on OpenAI Platform](#fine-tuning-on-openai-platform)
6. [Best Practices and Recommendations](#best-practices-and-recommendations)
7. [Evaluating Fine-Tuned Models](#evaluating-fine-tuned-models)
8. [Deploying Improved Models](#deploying-improved-models)

---

## Overview

SafeDose automatically captures every user interaction (dose calculations and AI scans) to build a continuously growing evaluation dataset. This data can be exported and used to fine-tune AI models, creating a self-improving system where real-world usage directly enhances accuracy.

### Key Benefits

- **Zero manual effort**: Data collection happens automatically during normal app usage
- **Real-world scenarios**: Training data reflects actual user needs and edge cases
- **Quality filtering**: Automatic scoring ensures only high-quality examples are used
- **Continuous improvement**: Models get better over time as more data is collected

### What Gets Captured

For **Manual Dose Calculations**:
- Input parameters (dose value, unit, concentration, syringe type)
- Calculation results (volume, recommended marking, errors)
- User context (substance name, medication type)
- Quality score based on data completeness and accuracy

For **AI Scans**:
- Captured image metadata (stored locally for privacy)
- Prompt sent to AI model
- Extracted information (syringe type, volume, vial details)
- Success/failure indicators
- Quality score based on completeness

---

## How Automatic Data Capture Works

### Technical Implementation

SafeDose uses the `useEvaluationDataCapture` hook to automatically capture data at two key points:

#### 1. During Dose Calculations

When a user completes a dose calculation, the system captures:

```typescript
// Automatically triggered in useDoseCalculator.ts
evaluationDataCapture.captureUserInteraction({
  prompt: "Calculate dose: 2.5 mg Semaglutide, 10 mg/ml concentration, using standard 1 ml syringe",
  userIntent: 'manual_entry',
  inputParameters: {
    doseValue: 2.5,
    unit: 'mg',
    substanceName: 'Semaglutide',
    concentration: 10,
    concentrationUnit: 'mg/ml',
    syringeType: 'Standard',
    syringeVolume: '1 ml'
  },
  result: {
    calculatedVolume: 0.25,
    recommendedMarking: '0.25 ml',
    calculationError: null
  }
});
```

#### 2. During AI Scans

When a user scans a syringe/vial with AI vision:

```typescript
// Automatically triggered in new-dose.tsx
evaluationDataCapture.captureUserInteraction({
  image: {
    uri: 'local://path/to/image',
    mimeType: 'image/jpeg'
  },
  prompt: "Analyze image for syringe and vial details...",
  userIntent: 'scan',
  inputParameters: {
    scanMode: 'ai_vision'
  },
  result: {
    scanResult: {
      syringe: { type: 'Standard', volume: '3 ml', ... },
      vial: { substance: 'Insulin', concentration: '100 units/ml', ... }
    },
    success: true
  }
});
```

### Data Storage

- **Local Storage**: All data stored in AsyncStorage using `evaluation_data_${userId}` key
- **Firestore (Optional)**: Authenticated users can opt-in to sync anonymized metadata
- **Privacy**: Images never leave the device; only metadata synced to cloud
- **Limits**: Maximum 500 most recent interactions per user to prevent storage bloat

### Quality Scoring

Each captured interaction receives a quality score (0-1) based on:

- **Completeness** (+0.2): All required input parameters present
- **Specificity** (+0.1): Substance name and detailed parameters provided
- **Success** (+0.2): Calculation/scan completed without errors
- **Context** (+0.1): Additional helpful information included
- **Image Quality** (+0.1): For scans, presence of clear image data

**Quality Thresholds**:
- **High Quality** (≥0.8): Ideal for training, complete and verified
- **Medium Quality** (0.6-0.8): Useful for training with review
- **Low Quality** (<0.6): Excluded from training datasets

---

## Accessing Captured Data

### Using the Export Function

The `useEvaluationDataCapture` hook provides an export function:

```typescript
// In your React component or admin panel
import { useEvaluationDataCapture } from './lib/hooks/useEvaluationDataCapture';

function ExportDataComponent() {
  const { exportEvaluationData, getDataStatistics } = useEvaluationDataCapture();
  
  const handleExport = async () => {
    // Export high-quality data (quality score >= 0.8)
    const data = await exportEvaluationData(0.8);
    
    console.log(`Exported ${data.length} high-quality examples`);
    
    // Data is now in evaluation format, ready for conversion
    return data;
  };
  
  const showStats = async () => {
    const stats = await getDataStatistics();
    console.log('Captured data statistics:', stats);
    // Output: { total: 150, byIntent: {...}, byQuality: {...}, recent: 45 }
  };
}
```

### Using the Export Script

A demonstration script is provided to export data programmatically:

```bash
cd /home/runner/work/SafeDose/SafeDose
node scripts/export-evaluation-data.js
```

This script:
1. Fetches all captured user interaction data
2. Filters by quality score (default: ≥0.6)
3. Converts to evaluation format
4. Converts to training format (JSONL)
5. Saves both formats to `evals/exported-data/`

**Output Files**:
- `evaluation-data-{timestamp}.json`: Full evaluation format with metadata
- `training-data-{timestamp}.jsonl`: OpenAI-compatible training format

---

## Preparing Data for Fine-Tuning

### Step 1: Export Your Data

```bash
# Run the export script
node scripts/export-evaluation-data.js

# This creates files in evals/exported-data/
# - evaluation-data-1234567890.json (full format)
# - training-data-1234567890.jsonl (training format)
```

### Step 2: Review Data Quality

Before fine-tuning, review the exported data:

```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('evals/exported-data/evaluation-data-1234567890.json'));

console.log(`Total examples: ${data.metadata.total_examples}`);
console.log(`Quality breakdown:`, data.metadata.categories);

// Review a sample
console.log('Sample evaluation:', JSON.stringify(data.evaluations[0], null, 2));
```

**What to Check**:
- ✅ Prompts are clear and well-formatted
- ✅ Expected outputs are accurate and consistent
- ✅ No personal information (PHI/PII) in the data
- ✅ Examples cover diverse scenarios and edge cases
- ✅ Quality scores reflect actual data quality

### Step 3: Split Data (Training/Validation)

For best results, split your data into training and validation sets:

```javascript
const data = require('./evals/exported-data/evaluation-data-1234567890.json');
const evaluations = data.evaluations;

// 80/20 split
const splitIndex = Math.floor(evaluations.length * 0.8);
const trainingSet = evaluations.slice(0, splitIndex);
const validationSet = evaluations.slice(splitIndex);

console.log(`Training: ${trainingSet.length}, Validation: ${validationSet.length}`);
```

### Step 4: Convert to OpenAI Format

OpenAI fine-tuning requires JSONL format with specific structure:

```javascript
function convertToOpenAIFormat(evaluations) {
  return evaluations.map(item => ({
    messages: [
      {
        role: "system",
        content: "You are SafeDose, an AI assistant that helps users calculate medication doses safely and accurately. Provide precise calculations and always prioritize patient safety."
      },
      {
        role: "user",
        content: item.prompt
      },
      {
        role: "assistant",
        content: JSON.stringify(item.expected_output, null, 2)
      }
    ]
  }));
}

// Convert and save
const trainingData = convertToOpenAIFormat(trainingSet);
const trainingJsonl = trainingData.map(item => JSON.stringify(item)).join('\n');

fs.writeFileSync('safedose-training.jsonl', trainingJsonl);
```

**Important**: Each line in the JSONL file must be a valid JSON object.

---

## Fine-Tuning on OpenAI Platform

### Prerequisites

1. **OpenAI Account**: Sign up at [platform.openai.com](https://platform.openai.com)
2. **API Key**: Generate an API key from your dashboard
3. **Credits**: Ensure you have sufficient credits for fine-tuning
4. **Data Files**: Prepared JSONL files (training and validation)

### Step-by-Step Process

#### Step 1: Install OpenAI CLI

```bash
pip install openai
```

Or use the OpenAI Python library:

```bash
pip install --upgrade openai
```

#### Step 2: Set Up Your API Key

```bash
export OPENAI_API_KEY='your-api-key-here'
```

Or in your script:

```python
import openai
openai.api_key = 'your-api-key-here'
```

#### Step 3: Upload Training Data

Using the CLI:

```bash
openai api files.create -f safedose-training.jsonl -p fine-tune
```

Using Python:

```python
import openai

# Upload training file
training_file = openai.File.create(
  file=open("safedose-training.jsonl", "rb"),
  purpose='fine-tune'
)

print(f"Training file ID: {training_file.id}")
```

**Note the file ID** - you'll need it for the next step.

#### Step 4: Upload Validation Data (Optional but Recommended)

```python
validation_file = openai.File.create(
  file=open("safedose-validation.jsonl", "rb"),
  purpose='fine-tune'
)

print(f"Validation file ID: {validation_file.id}")
```

#### Step 5: Create Fine-Tuning Job

Using the CLI:

```bash
openai api fine_tunes.create \
  -t file-abc123 \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "safedose-v1"
```

Using Python:

```python
fine_tune = openai.FineTuningJob.create(
  training_file=training_file.id,
  validation_file=validation_file.id,  # Optional
  model="gpt-4o-mini-2024-07-18",  # or "gpt-4o-2024-08-06" for vision
  suffix="safedose-v1",
  hyperparameters={
    "n_epochs": 3,  # Adjust based on dataset size
    "batch_size": 1,
    "learning_rate_multiplier": 1.0
  }
)

print(f"Fine-tuning job ID: {fine_tune.id}")
```

#### Step 6: Monitor Training Progress

List all fine-tuning jobs:

```bash
openai api fine_tunes.list
```

Check specific job status:

```bash
openai api fine_tunes.get -i ft-abc123
```

Using Python:

```python
import time

# Poll for completion
while True:
    job = openai.FineTuningJob.retrieve(fine_tune.id)
    print(f"Status: {job.status}")
    
    if job.status == 'succeeded':
        print(f"Fine-tuned model: {job.fine_tuned_model}")
        break
    elif job.status == 'failed':
        print(f"Training failed: {job.error}")
        break
    
    time.sleep(60)  # Check every minute
```

#### Step 7: Retrieve Fine-Tuned Model

Once training completes, note the model ID (e.g., `ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123`).

---

## Best Practices and Recommendations

### Data Preparation

1. **Minimum Dataset Size**
   - Start with at least **50-100** high-quality examples
   - Aim for **500-1000** examples for production use
   - More data generally improves performance, but quality > quantity

2. **Diverse Examples**
   - Include various medication types (peptides, insulin, standard drugs)
   - Cover all unit combinations (mg, mcg, units, mL)
   - Include edge cases (very small/large doses, errors)
   - Balance successful and error cases (80/20 split recommended)

3. **Consistent Formatting**
   - Use identical prompt structure across examples
   - Standardize response format (JSON structure)
   - Include system message for context and behavior

4. **Privacy Compliance**
   - **Never include** patient names, dates of birth, or medical record numbers
   - **Anonymize** any substance names if proprietary/sensitive
   - **Exclude** images with personal information visible
   - **Review** all exported data before uploading

### Model Selection

For SafeDose use cases:

| Model | Use Case | Pros | Cons |
|-------|----------|------|------|
| `gpt-4o-mini` | Dose calculations | Fast, cost-effective, accurate for structured tasks | Limited vision capabilities |
| `gpt-4o` | Vision + calculations | Full vision support, highest accuracy | Higher cost |
| `gpt-4` | Legacy calculations | Reliable, well-tested | Slower, more expensive |

**Recommendation**: Start with `gpt-4o-mini` for dose calculations, use `gpt-4o` for vision-based scanning.

### Hyperparameters

#### Number of Epochs (`n_epochs`)

- **Small dataset (50-200 examples)**: 3-5 epochs
- **Medium dataset (200-1000 examples)**: 2-3 epochs  
- **Large dataset (1000+ examples)**: 1-2 epochs
- **Tip**: More epochs risk overfitting; start conservative

#### Batch Size

- **Default**: 1-4 for small datasets
- **Larger datasets**: Can increase to 8-16
- **Note**: OpenAI automatically adjusts if not specified

#### Learning Rate Multiplier

- **Default**: 1.0 (recommended for most cases)
- **Fine-tuning**: Try 0.5-2.0 if results aren't optimal
- **Tip**: Lower values (0.5) for stable training, higher (2.0) for faster convergence

### Cost Estimation

OpenAI charges based on tokens processed during training:

```
Cost = (Number of tokens in training file) × (Number of epochs) × (Cost per token)
```

**Example Calculation**:
- Training file: 500 examples × 200 tokens = 100,000 tokens
- Epochs: 3
- Total tokens: 300,000
- Cost (gpt-4o-mini): ~$1.50 USD

**Tips to Reduce Costs**:
- Remove verbose examples
- Use shorter prompts when possible
- Start with fewer epochs
- Use smaller model (gpt-4o-mini vs gpt-4o)

### Iteration Strategy

1. **Baseline**: Start with 100 high-quality examples, 3 epochs
2. **Evaluate**: Test on validation set, measure accuracy
3. **Analyze**: Identify failure modes in fine-tuned model
4. **Enhance**: Add 100-200 examples targeting failures
5. **Retrain**: Fine-tune again with expanded dataset
6. **Repeat**: Continue cycle until target accuracy achieved

---

## Evaluating Fine-Tuned Models

### Using the Evaluation Framework

SafeDose includes built-in evaluation test sets:

```bash
# Use your fine-tuned model
export OPENAI_MODEL="ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123"

# Run evaluations (manual for now)
cat evals/test-sets/basic-dose-calculations.json
# Test each evaluation manually and record results
```

### Programmatic Testing

```python
import openai
import json

# Load evaluation test set
with open('evals/test-sets/basic-dose-calculations.json') as f:
    test_set = json.load(f)

# Test fine-tuned model
model_id = "ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123"
results = []

for eval_item in test_set['evaluations']:
    response = openai.ChatCompletion.create(
        model=model_id,
        messages=[
            {"role": "system", "content": "You are SafeDose..."},
            {"role": "user", "content": eval_item['prompt']}
        ]
    )
    
    actual_output = json.loads(response.choices[0].message.content)
    expected_output = eval_item['expected_output']
    
    # Compare outputs
    matches = (
        actual_output.get('calculatedVolume') == expected_output.get('calculatedVolume') and
        actual_output.get('recommendedMarking') == expected_output.get('recommendedMarking')
    )
    
    results.append({
        'id': eval_item['id'],
        'passed': matches,
        'actual': actual_output,
        'expected': expected_output
    })

# Calculate accuracy
accuracy = sum(1 for r in results if r['passed']) / len(results)
print(f"Model accuracy: {accuracy * 100:.1f}%")
```

### Key Metrics to Track

1. **Overall Accuracy**: % of test cases passing
2. **Category Accuracy**: Accuracy by type (dose calculations, unit conversions, etc.)
3. **Error Rate**: % of responses with errors
4. **Precision**: Are calculations exact?
5. **Recall**: Does model catch all safety issues?

### A/B Testing

Compare fine-tuned vs. base model:

```python
models = {
    'base': 'gpt-4o-mini-2024-07-18',
    'fine_tuned': 'ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123'
}

results = {}
for model_name, model_id in models.items():
    # Run evaluation for each model
    results[model_name] = evaluate_model(model_id, test_set)

print(f"Base model: {results['base']['accuracy']:.1%}")
print(f"Fine-tuned: {results['fine_tuned']['accuracy']:.1%}")
print(f"Improvement: {results['fine_tuned']['accuracy'] - results['base']['accuracy']:.1%}")
```

---

## Deploying Improved Models

### Update SafeDose Configuration

Once you have a fine-tuned model with better performance:

1. **Update Environment Variables**

```bash
# In .env or app.config.js
OPENAI_MODEL="ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123"
```

2. **Update Code References**

Find where models are called (e.g., `lib/cameraUtils.ts`):

```typescript
// Before
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini-2024-07-18',
  // ...
});

// After
const response = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
  // ...
});
```

3. **Test Thoroughly**

- Run full evaluation suite
- Test in staging environment
- Perform user acceptance testing
- Monitor error rates and user feedback

### Versioning Strategy

Track model versions for rollback capability:

```javascript
const MODEL_VERSIONS = {
  'v1.0': 'gpt-4o-mini-2024-07-18',  // Base model
  'v1.1': 'ft:gpt-4o-mini:safedose:v1:abc123',  // First fine-tune
  'v1.2': 'ft:gpt-4o-mini:safedose:v2:def456',  // Improved
  'current': 'v1.2'
};

const currentModel = MODEL_VERSIONS[MODEL_VERSIONS.current];
```

### Monitoring

After deployment, monitor:

- **User satisfaction**: Feedback and ratings
- **Accuracy metrics**: Real-world calculation success rate
- **Error patterns**: New failure modes
- **Performance**: Response times and costs
- **Data capture**: Continue collecting for next iteration

### Continuous Improvement Cycle

```
1. Deploy model → 2. Collect user data → 3. Export high-quality examples
                                              ↓
6. Monitor & iterate ← 5. Deploy improved model ← 4. Fine-tune with new data
```

---

## Advanced Topics

### Multi-Task Fine-Tuning

For SafeDose, you can fine-tune separate models for different tasks:

1. **Dose Calculator Model**: Fine-tuned on calculation examples only
2. **Vision Model**: Fine-tuned on image analysis examples only
3. **Combined Model**: Fine-tuned on both task types

**Recommendation**: Start with task-specific models for better performance per task.

### Incremental Learning

As you collect more data over time:

```python
# Fine-tune from previous fine-tuned model
new_fine_tune = openai.FineTuningJob.create(
  training_file=new_training_file.id,
  model="ft:gpt-4o-mini:safedose:v1:abc123",  # Previous fine-tuned model
  suffix="safedose-v2"
)
```

This builds on previous learning rather than starting from scratch.

### Custom Evaluation Metrics

Define domain-specific metrics for SafeDose:

```python
def evaluate_safety(prediction, ground_truth):
    """Check if unsafe doses are flagged"""
    if ground_truth['calculationError'] and not prediction['calculationError']:
        return 0  # Failed to catch unsafe dose
    return 1

def evaluate_precision(prediction, ground_truth):
    """Check calculation precision (within 0.01 ml)"""
    if abs(prediction['calculatedVolume'] - ground_truth['calculatedVolume']) <= 0.01:
        return 1
    return 0

# Custom scoring
safety_score = sum(evaluate_safety(p, gt) for p, gt in results) / len(results)
precision_score = sum(evaluate_precision(p, gt) for p, gt in results) / len(results)
```

---

## Troubleshooting

### Common Issues

**Issue**: "Training file format error"
- **Solution**: Ensure each line in JSONL is valid JSON, check for trailing commas

**Issue**: "Fine-tuning job failed"
- **Solution**: Check file uploaded correctly, verify sufficient credits, review OpenAI status

**Issue**: "Model not improving accuracy"
- **Solution**: Need more diverse examples, try more epochs, check for data quality issues

**Issue**: "High costs"
- **Solution**: Reduce training file size, use fewer epochs, switch to smaller model

### Getting Help

- **OpenAI Documentation**: [platform.openai.com/docs/guides/fine-tuning](https://platform.openai.com/docs/guides/fine-tuning)
- **SafeDose Issues**: [github.com/rodneyg/SafeDose/issues](https://github.com/rodneyg/SafeDose/issues)
- **Community**: Join SafeDose community discussions for best practices

---

## Summary Checklist

Fine-tuning SafeDose models:

- [ ] Accumulate 50-100+ high-quality user interactions
- [ ] Export data using `exportEvaluationData(0.8)`
- [ ] Review data for quality and privacy compliance
- [ ] Split into training (80%) and validation (20%) sets
- [ ] Convert to OpenAI JSONL format
- [ ] Upload training/validation files to OpenAI
- [ ] Create fine-tuning job with appropriate hyperparameters
- [ ] Monitor training progress
- [ ] Evaluate fine-tuned model on test sets
- [ ] Compare with base model (A/B testing)
- [ ] Deploy if accuracy improved
- [ ] Monitor production performance
- [ ] Repeat cycle with new data

**Remember**: The key to success is the continuous cycle of data collection → fine-tuning → evaluation → deployment → data collection.

---

*This guide will be updated as the SafeDose evaluation framework evolves. Contributions and improvements are welcome!*
