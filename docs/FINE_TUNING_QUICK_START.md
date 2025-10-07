# Model Fine-Tuning Quick Start Guide

**TL;DR**: Export captured user data → Prepare for OpenAI → Fine-tune → Deploy improved model

## 5-Minute Quick Start

### 1. Export Data (30 seconds)

```bash
cd /path/to/SafeDose
node scripts/export-evaluation-data.js
```

**Output**: `evals/exported-data/training-data-{timestamp}.jsonl`

### 2. Upload to OpenAI (2 minutes)

```bash
# Install OpenAI CLI if needed
pip install openai

# Set API key
export OPENAI_API_KEY='your-key-here'

# Upload training file
openai api files.create -f evals/exported-data/training-data-*.jsonl -p fine-tune
```

**Note the file ID** returned (e.g., `file-abc123xyz`)

### 3. Start Fine-Tuning (1 minute)

```bash
# Create fine-tuning job
openai api fine_tunes.create \
  -t file-abc123xyz \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "safedose-v1"
```

**Wait**: Training takes 10-30 minutes depending on data size

### 4. Get Your Model (30 seconds)

```bash
# Check status
openai api fine_tunes.list

# When status = "succeeded", get model ID
# Example: ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123
```

### 5. Deploy (1 minute)

Update your `.env` or `app.config.js`:

```bash
OPENAI_MODEL="ft:gpt-4o-mini-2024-07-18:safedose:safedose-v1:abc123"
```

Done! 🎉

---

## What You Need

- **Minimum 50 high-quality examples** (automatically captured from user interactions)
- **OpenAI account** with API access
- **API credits** (~$1-5 for typical training job)
- **15-30 minutes** total time

---

## Quick Commands Cheat Sheet

```bash
# Export data
node scripts/export-evaluation-data.js

# Upload file
openai api files.create -f training-data.jsonl -p fine-tune

# Start training
openai api fine_tunes.create -t FILE_ID -m gpt-4o-mini-2024-07-18

# Check status
openai api fine_tunes.list

# Get specific job details
openai api fine_tunes.get -i ft-abc123

# List your fine-tuned models
openai api fine_tunes.list --limit 10
```

---

## Python Quick Script

```python
import openai

# Setup
openai.api_key = "your-key-here"

# Upload
with open("evals/exported-data/training-data-latest.jsonl", "rb") as f:
    file = openai.File.create(file=f, purpose='fine-tune')
    
print(f"File ID: {file.id}")

# Train
job = openai.FineTuningJob.create(
    training_file=file.id,
    model="gpt-4o-mini-2024-07-18",
    suffix="safedose-v1"
)

print(f"Job ID: {job.id}")
print("Training started! Check status with:")
print(f"openai api fine_tunes.get -i {job.id}")
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No data to export" | Use SafeDose more to accumulate interactions |
| "File format error" | Ensure JSONL has one valid JSON per line |
| "Insufficient credits" | Add payment method in OpenAI dashboard |
| "Training failed" | Check file uploaded correctly, review logs |
| "Model not improving" | Need more diverse examples, try 100+ examples |

---

## Next Steps

- **Full Guide**: See [MODEL_FINE_TUNING_GUIDE.md](MODEL_FINE_TUNING_GUIDE.md) for:
  - Best practices and hyperparameter tuning
  - Data quality guidelines
  - Advanced evaluation techniques
  - Cost optimization strategies
  - Production deployment tips

- **Evaluation Framework**: See [../Evals.md](../Evals.md) for:
  - How automatic data capture works
  - Evaluation test sets
  - Quality scoring details
  - Community contribution guidelines

---

**Pro Tip**: Start with 100 examples and 3 epochs. Evaluate results. If accuracy improves, gather 500+ examples for production model.

**Remember**: More user interactions = better training data = more accurate models!
