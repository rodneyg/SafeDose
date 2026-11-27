# Google Sign-In Setup Guide

This guide describes the Google sign-in callback and authorized app hosts used by SafeDose. The app uses Firebase Authentication's JavaScript SDK for web sign-in.

## Google sign-in callback

The OAuth callback uses the Firebase `authDomain` configured in [app.config.js](app.config.js). In the default configuration, the callback is:

```
https://safedose-e320d.firebaseapp.com/__/auth/handler
```

If a deployment sets `FIREBASE_AUTH_DOMAIN`, register
`https://<auth-domain>/__/auth/handler` in the Google OAuth client's authorized
redirect URIs and make sure that host serves the Firebase auth helper. See
[Firebase's redirect setup guide](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Authorized app hosts

In Firebase Authentication, authorize the app hosts that should allow sign-in.
These include `safedose.rodneygainous.com` and `safe-dose.vercel.app`.
Authorize `localhost` in a development project if using local sign-in. For
sign-in on a preview, authorize the exact preview hostname. If your OAuth
client requires JavaScript origins, use each app's origin, including its
scheme and local port where applicable.

## Enable Google sign-in

In Firebase Console, open Authentication > Sign-in method and enable the Google
provider for the SafeDose Firebase project.

The web sign-in implementation uses Firebase's `GoogleAuthProvider` with
`signInWithPopup`, falling back to `signInWithRedirect` when popups are not
available. It does not read Google client ID environment variables.

For the callback address and authorized app host guidance, see the canonical
[Authentication Configuration](docs/auth-config.md).
