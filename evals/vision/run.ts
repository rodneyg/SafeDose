import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, extname } from 'node:path';
import OpenAI from 'openai';
import { adaptCorpusEntry, selectDevelopment, type CorpusEntry } from './corpus';
import { readScan, SCAN_MODEL, SCAN_PROMPT } from '../../lib/scan';
import {
  sha256, loadImage, scoreScan, summarize, evaluateThresholds, renderMarkdown,
  type EvalLabel, type Fixture, type EvalResult, type Thresholds,
} from './harness';

interface Recording { id: string; sha256: string; model_output: unknown }
interface Recordings { model: string; temperature: number; prompt_sha256: string; outputs: Recording[] }
const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));

function validateLabels(value: unknown): EvalLabel[] {
  if (!Array.isArray(value)) throw new Error('Labels must be a JSON array.');
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(entry.id) || seen.has(entry.id) ||
        !/^[a-f0-9]{64}$/i.test(entry.sha256) || !['read', 'refuse'].includes(entry.expected_behavior) ||
        !entry.review || typeof entry.review.status !== 'string') throw new Error('Invalid or duplicate eval label.');
    seen.add(entry.id);
  }
  return value as EvalLabel[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (args.some(arg => !['--offline', '--live', '--legacy'].includes(arg) && !/^--limit=\d+$/.test(arg)) || (args.includes('--offline') && args.includes('--live'))) {
    throw new Error('Usage: npm run eval:vision -- [--offline | --live] [--limit=12] [--legacy]');
  }
  // Always require explicit --live, even when a key happens to exist in the shell.
  const live = args.includes('--live');
  const imageRoot = process.env.SAFEDOSE_EVAL_IMAGES_DIR;
  if (live && !imageRoot) throw new Error('SAFEDOSE_EVAL_IMAGES_DIR is required for --live.');
  if (live && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for --live.');
  const directory = resolve('evals/vision');
  const legacy = args.includes('--legacy');
  if (!legacy) execFileSync(process.execPath, [resolve(directory, 'check-corpus.js')], { stdio: 'pipe' });
  const allLabels = legacy
    ? validateLabels(await readJson(resolve(directory, 'manifest.json')))
    : (await readJson(resolve(directory, 'synthetic-manifest.json')) as CorpusEntry[]).map(adaptCorpusEntry);
  const limit = Number(limitArg?.split('=')[1] ?? 12);
  if (limitArg && !live) throw new Error('--limit requires --live');
  if (live && legacy) throw new Error('Legacy source inventory is not eligible for live calls');
  const labels = live ? selectDevelopment(allLabels, limit) : allLabels;
  // Fail closed before any paid request, never score changed/missing pixels.
  if (imageRoot) {
    execFileSync(process.execPath, [resolve(directory, 'check-exif.js'), resolve(imageRoot, 'images')], { stdio: 'pipe' });
    for (const label of labels) if ((await loadImage(imageRoot, label)).status !== 'verified') throw new Error('Image integrity preflight failed');
  }
  const fixtures = await readJson(resolve(directory, 'fixtures/model-outputs.json')) as Fixture[];
  validateLabels(fixtures.map(fixture => fixture.label));
  if (fixtures.some(f => f.verified_by !== 'pending-rodney' || f.label.verified_by !== 'pending-rodney' || f.label.review.status !== 'pending')) throw new Error('Synthetic fixtures must remain pending Rodney verification.');
  const thresholds = await readJson(resolve(directory, 'thresholds.json')) as Thresholds;
  const recordings = new Map<string, Recording>();
  if (process.env.SAFEDOSE_EVAL_RECORDINGS) {
    const file = await readJson(resolve(process.env.SAFEDOSE_EVAL_RECORDINGS)) as Recordings;
    if (file.model !== SCAN_MODEL || file.temperature !== 0 || file.prompt_sha256 !== sha256(SCAN_PROMPT) || !Array.isArray(file.outputs)) throw new Error('Recording model, temperature, or prompt hash does not match the current scan path.');
    for (const output of file.outputs) {
      if (recordings.has(output.id) || !labels.some(label => label.id === output.id && label.sha256 === output.sha256)) throw new Error('Recording id/sha256 must match exactly one label.');
      recordings.set(output.id, output);
    }
  }
  if (live && ![process.env.SAFEDOSE_EVAL_INPUT_USD_PER_MILLION, process.env.SAFEDOSE_EVAL_OUTPUT_USD_PER_MILLION].every(rate => rate && Number.isFinite(Number(rate)) && Number(rate) > 0)) throw new Error('Live calls require positive token rates for cost accounting');
  const client = live ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 0 }) : null;
  const rows: EvalResult[] = [];
  let spent = 0;
  let stoppedForBudget = false;
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const checkpoint = resolve('evals/vision/.cache', `${runId}.json`);
  if (live) await mkdir(resolve('evals/vision/.cache'), { recursive: true });
  const recordedOutputs: Recording[] = [];
  for (const label of labels) {
    // Reserve the entire model input context plus capped output before each request.
    // This intentionally overestimates these 1500x1000 scenes and stays below $3/run.
    const requestCeiling = (128000 * Number(process.env.SAFEDOSE_EVAL_INPUT_USD_PER_MILLION) + 1200 * Number(process.env.SAFEDOSE_EVAL_OUTPUT_USD_PER_MILLION)) / 1_000_000;
    if (live && spent + requestCeiling > 3) { stoppedForBudget = true; break; }
    const start = performance.now();
    const image = imageRoot ? await loadImage(imageRoot, label) : { status: 'no-image-store', bytes: null };
    let source: EvalResult['source'] = 'not-evaluated';
    let imageStatus = image.status;
    let modelOutput = '';
    let usage: EvalResult['usage'] = null;
    let cost: number | null = live ? null : 0;
    // A mismatched/missing pixel file is never submitted or scored as a genuine prediction.
    const allowed = !imageRoot || image.status === 'verified';
    const recording = recordings.get(label.id);
    let scan;
    if (client && image.bytes) {
      const mime = extname(label.file ?? '').toLowerCase() === '.png' ? 'image/png' : extname(label.file ?? '').toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg';
      scan = await readScan(`data:${mime};base64,${image.bytes.toString('base64')}`, {
        complete: async request => {
          const response = await client.chat.completions.create({ ...request, max_tokens: 1200 });
          modelOutput = response.choices[0]?.message.content ?? '';
          if (response.usage) usage = { prompt_tokens: response.usage.prompt_tokens, completion_tokens: response.usage.completion_tokens };
          return modelOutput;
        },
      });
      source = 'live';
      recordedOutputs.push({ id: label.id, sha256: label.sha256, model_output: modelOutput });
      // Explicit current rates were required before any call. Usage is token-priced, not an invoice.
      const inputRate = process.env.SAFEDOSE_EVAL_INPUT_USD_PER_MILLION;
      const outputRate = process.env.SAFEDOSE_EVAL_OUTPUT_USD_PER_MILLION;
      const tokens = usage as EvalResult['usage'];
      if (tokens && inputRate && outputRate && Number.isFinite(Number(inputRate)) && Number.isFinite(Number(outputRate)) && Number(inputRate) >= 0 && Number(outputRate) >= 0) {
        cost = (tokens.prompt_tokens * Number(inputRate) + tokens.completion_tokens * Number(outputRate)) / 1_000_000;
      }
    } else {
      if (recording && allowed) {
        source = 'recorded';
        modelOutput = typeof recording.model_output === 'string' ? recording.model_output : JSON.stringify(recording.model_output);
      } else if (allowed) imageStatus = `${imageStatus}; no-recorded-output`;
      // The empty response closes the scan path. This is explicitly NOT an observed refusal.
      scan = await readScan('', { modelOutput });
    }
    rows.push(scoreScan(label, scan, { source, image_status: imageStatus, latency_ms: performance.now() - start, cost_usd: cost, usage }));
    if (live) {
      if (cost !== null) spent += cost;
      // Persist each completed request so a later network failure cannot erase cost evidence.
      await writeFile(checkpoint, JSON.stringify({ model: SCAN_MODEL, temperature: 0,
        prompt_sha256: sha256(SCAN_PROMPT), total_cost_usd: cost === null ? null : spent, known_cost_usd: spent, outputs: recordedOutputs, results: rows }, null, 2) + '\n');
      if (cost === null) throw new Error('Missing usage; no further paid calls allowed');
    }
  }
  // CI exercises the complete path without pixels or a network. Do not mix synthetic scores into live accuracy.
  if (!live) for (const fixture of fixtures) {
    const start = performance.now();
    const scan = await readScan('', { modelOutput: JSON.stringify(fixture.model_output) });
    rows.push(scoreScan(fixture.label, scan, { source: 'synthetic', image_status: 'text-only-fixture', latency_ms: performance.now() - start, cost_usd: 0 }));
  }
  const summary = summarize(rows);
  const realSummary = summarize(rows.filter(row => row.source !== 'synthetic'));
  const syntheticSummary = summarize(rows.filter(row => row.source === 'synthetic'));
  const gate = evaluateThresholds(summary, thresholds);
  const pending = labels.some(label => label.review.status === 'pending');
  const enforced = !pending && (process.env.SAFEDOSE_EVAL_ENFORCE === '1' || thresholds.status === 'approved');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const timestamp = new Date().toISOString();
  const base = resolve('evals/results', `${runId}-${commit.slice(0, 8)}-${live ? 'live' : 'offline'}`);
  const context = { mode: live ? 'live' : 'offline', commit, enforced, manifest_count: labels.length };
  const markdown = renderMarkdown(summary, gate, context) +
    `\n## Prediction provenance\n\nImage predictions: ${realSummary.observed}/${labels.length}. Synthetic fixtures: ${syntheticSummary.observed}. Image-only accuracy is not yet established by an offline fixture run. JSON contains separate image and synthetic summaries.\n`;
  await mkdir(resolve('evals/results'), { recursive: true });
  await writeFile(`${base}.json`, JSON.stringify({
    notice: 'LABELS PENDING RODNEY VERIFICATION: scores are not an official accuracy gate.',
    ...context, total_cost_usd: spent, stopped_for_budget: stoppedForBudget, corpus: legacy ? 'legacy-source-inventory' : 'synthetic-v1', split: live ? 'development-only' : 'all, integrity only without recordings', pending_labels: pending, timestamp, model: SCAN_MODEL, temperature: 0, prompt_sha256: sha256(SCAN_PROMPT),
    live_baseline: live ? 'this run; labels still pending verification' : 'not yet run',
    thresholds, gate, summary, image_summary: realSummary, synthetic_summary: syntheticSummary, results: rows,
  }, null, 2) + '\n');
  await writeFile(`${base}.md`, markdown);
  process.stdout.write(markdown);
  if (enforced && !gate.would_pass) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const status = (error as { status?: unknown })?.status;
  const code = (error as { code?: unknown })?.code;
  if (typeof status === 'number') process.stderr.write(`API HTTP status: ${status}.\n`);
  if (['invalid_api_key', 'insufficient_quota', 'model_not_found', 'rate_limit_exceeded'].includes(String(code))) process.stderr.write(`API category: ${code}.\n`);
  // Avoid dumping SDK requests/errors that could contain credentials or base64 pixels.
  process.stderr.write('Vision harness failed. Check arguments, manifest/recording schema, store access, or live API configuration. No API request details are logged.\n');
  process.exitCode = 1;
});
