# Scan abuse protection

`POST /api/analyze-scan` permits 10 attempts per IP in a sliding 60-second
window, including failed requests. It returns HTTP 429 with `Retry-After`
in seconds before calling OpenAI. Constants live in `analyze-scan.js`.
The address comes from the first `x-forwarded-for` entry, then `x-real-ip`,
then the socket address; unidentified clients share a window. Deploy behind
Vercel's trusted proxy, which supplies the forwarding headers.

Windows are in module memory, separately for each instance. Cold starts reset
them and traffic across instances has separate allowances. This is best-effort
abuse protection, not a global spend cap or authentication. Shared-IP clients
share an allowance. At 10,000 active IPs the instance rejects new IPs until
capacity is available rather than evicting active limits. No paid service or
new secret is required. Firebase Admin is not a dependency in this repository,
so client-provided identities are not trusted or used to bypass IP limits.

Browser Origins must be HTTPS `safe-dose.vercel.app`, HTTPS `safedose.rodneygainous.com`, or a team preview
`safe-dose-<hash>-rodneygs-projects.vercel.app` (`safedoseai.com` is not registered, so it is deliberately not allowed); HTTP/HTTPS localhost with optional ports is
also allowed. Native requests without Origin are allowed. Origin filtering is
browser protection: non-browser callers can omit or forge Origin.

The scan request ignores caller model/prompt/temperature settings. The shared
`lib/scan/request.js` pins `gpt-4o-2024-08-06`, temperature 0, JSON-object output,
and the existing syringe/vial extraction and safety/refusal prompt.

CI exports the web app, then scans exported text assets and resolved Expo
`extra` for secret patterns and the exact server OpenAI key when available.
Diagnostics contain paths only. Run `npm run build:web` followed by
`npm run check:bundle-secrets` locally.
