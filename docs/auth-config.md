# Authentication Configuration

## Google sign-in callback

SafeDose uses the Firebase JavaScript SDK for web sign-in. The OAuth callback
uses the Firebase `authDomain` configured in [app.config.js](../app.config.js).
In the default configuration, the callback is

```
https://safedose-e320d.firebaseapp.com/__/auth/handler
```

If a deployment sets `FIREBASE_AUTH_DOMAIN`, register
`https://<auth-domain>/__/auth/handler` in the Google OAuth client's authorized
redirect URIs and make sure that host serves the Firebase auth helper.
See [Firebase's redirect setup guide](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Authorized app hosts

In Firebase Authentication, authorize the app hosts that should allow sign-in.
These include `safedose.rodneygainous.com` and `safe-dose.vercel.app`.
Authorize `localhost` in a development project if using local sign-in.
For sign-in on a preview, authorize the exact preview hostname. If your OAuth
client requires JavaScript origins, use each app's origin, including its
scheme and local port where applicable.
