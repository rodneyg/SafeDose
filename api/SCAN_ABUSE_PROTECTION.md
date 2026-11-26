# Scan abuse protection

Each of these routes has its own per-IP limit for POST requests, including
failed attempts, over a sliding 60-second window:

- 10 requests: `/api/analyze-scan` and `/api/upgrade-email`
- 30 requests: `/api/create-checkout-session`, `/api/create-portal-session`,
  `/api/get-subscription-status`, and `/api/validate-session`

Requests over the limit return HTTP 429 with `Retry-After` in seconds before
reaching OpenAI, Firebase Admin, or Stripe. On Vercel the key comes from its
`x-vercel-forwarded-for` header when it contains a valid IP. Direct connections
use the socket address. Requests with no address share one bucket. The Stripe
webhook and public health checks keep their existing handling.

Windows are in module memory. Cold starts reset them and each instance has
its own allowances. At 10,000 active IPs, an instance rejects new IPs until
capacity is available. Clients on a shared IP share an allowance.

SafeDose uses Firebase client authentication and sends Firebase ID tokens
where the API requires them. The app does not issue authentication cookies.

Browser Origins must be HTTPS `safedose.rodneygainous.com` (canonical), `safe-dose.vercel.app` (fallback), or a team preview
`safe-dose-<hash>-rodneygs-projects.vercel.app` or a branch preview `safe-dose-git-<branch>-rodneygs-projects.vercel.app`. HTTP/HTTPS localhost with optional ports is also allowed. Native requests without Origin are allowed. Origin filtering is
browser protection: non-browser callers can omit or forge Origin.

The scan request ignores caller model, prompt, and sampling settings. The shared
`lib/scan/request.js` uses `gpt-6-luna` with Chat Completions and image input,
JSON-object output, and the existing syringe/vial extraction and safety/refusal
prompt. GPT-6 Luna requires `reasoning_effort: 'none'` to use `temperature: 0`.
Standard pricing is $0.10 per million input tokens and $0.50 per million output
tokens for prompts up to 272K tokens. For example, a scan using 3,000 input tokens
(including the image) and 600 output tokens would cost about $0.0006. Actual
cost depends on the image and token usage. [Model and pricing details](https://developers.openai.com/api/docs/models/gpt-6-luna).

CI exports the web app, then scans exported text assets and resolved Expo
`extra` for secret patterns and the exact server OpenAI key when available.
Diagnostics contain paths only. Run `npm run build:web` followed by
`npm run check:bundle-secrets` locally.
