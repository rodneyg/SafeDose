# iPhone home-screen app

Build with `npm run build:web`. The final step generates `dist/sw.js` from the
exported HTML, JS, CSS, fonts, and images. Deploy the complete `dist` directory
over HTTPS using the existing deployment flow. No provider settings are changed.

In iPhone Safari, open the site, then Share > Add to Home Screen > Add.
Open SafeDose from that icon to use standalone mode. Finish initial setup online
and allow the first static download to complete before relying on offline use.
Browser storage eviction or clearing site data requires another online visit.

The existing manual calculator runs from cached static assets. While offline,
the calculator shows a notice and routes camera entry to manual entry. Photo
analysis, sign-in, billing, and account sync require internet. Camera capture
uses the existing camera flow and still requires HTTPS and camera permission.
No dosing formulas or medical rules were changed.

Only build-time static files are cached. API responses, external requests, user
photos, and account records are not added to the service worker cache. Existing
application storage behavior is unchanged. Static files are served from one
versioned cache so offline startup avoids a network timeout and open tabs keep
a consistent build. Updates activate after all existing tabs/windows close.
Old SafeDose static caches are then removed. No forced reload occurs mid-entry.

## Verification

Automated: `npx jest scripts/__tests__/service-worker.test.js --runInBand`.
Tests exercise worker installation, offline routes/assets, cache versioning,
update cleanup, failed installation, and network-only requests without a browser.

Real iPhone checks still required on the deployed preview:

1. Confirm the home-screen icon and standalone launch.
2. Finish onboarding online, close and reopen, then enable airplane mode.
3. Cold-launch offline, enter a manual calculation, and confirm photo entry
   directs to manual mode. Reconnect and confirm normal photo-check behavior.
4. Allow and deny camera permission; test capture from the installed app.
5. Open an updated build, close all SafeDose windows, and confirm the next launch
   uses the new build. Check cold and cached load times on mobile data.

Headless build and worker tests do not establish iPhone permission behavior,
end-to-end offline calculator completion, or measured device load times.
