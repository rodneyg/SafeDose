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
`safe-dose-<hash>-rodneygs-projects.vercel.app` or a branch preview `safe-dose-git-<branch>-rodneygs-projects.vercel.app` (`safedoseai.com` is not registered, so it is deliberately not allowed); HTTP/HTTPS localhost with optional ports is
also allowed. Native requests without Origin are allowed. Origin filtering is
browser protection: non-browser callers can omit or forge Origin.

The scan request ignores caller model/prompt/temperature settings. The shared
`lib/scan/request.js` pins `gpt-4o-2024-08-06`, temperature 0, JSON-object output,
and the existing syringe/vial extraction and safety/refusal prompt.

CI exports the web app, then scans exported text assets and resolved Expo
`extra` for secret patterns and the exact server OpenAI key when available.
Diagnostics contain paths only. Run `npm run build:web` followed by
`npm run check:bundle-secrets` locally.
