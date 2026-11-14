# Authentication Configuration

## Google Sign-In Redirect URIs

When setting up Google Sign-In in the Google Cloud Console, you need to configure the following redirect URIs:

### Local Development
```
http://localhost:8081/__/auth/handler
```

### Production
```
https://safe-dose.vercel.app/__/auth/handler
```

## Setting up Google Sign-In in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Credentials"
4. Create or edit an OAuth 2.0 Client ID
5. Add the redirect URIs mentioned above to the "Authorized redirect URIs" section
6. Save your changes

These URIs are essential for the OAuth flow to properly redirect back to the application after authentication is complete.

Authorized JavaScript origins: `https://safe-dose.vercel.app` and `http://localhost:8081`. Firebase Auth must authorize `safe-dose.vercel.app` and `localhost`. Preview deployments require their exact hostnames and OAuth origins/redirect URIs; wildcard authorization is not assumed.
