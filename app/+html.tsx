import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="SafeDose" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="description" content="SafeDose helps you work out syringe units and reconstitution doses. Education only, not medical advice." />
        <meta property="og:site_name" content="SafeDose" />
        <meta property="og:image" content="https://safedose.rodneygainous.com/icons/icon-512.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <script src="/register-sw.js" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
