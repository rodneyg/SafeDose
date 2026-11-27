import { usePathname } from 'expo-router';
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { canonicalUrl, getSeoMetadata, OG_IMAGE_URL } from '../lib/seo';

const privateTitles: Record<string, string> = {
  '/login': 'Sign In | SafeDose',
  '/reset-password': 'Reset password | SafeDose',
  '/success': 'Subscription status | SafeDose',
  '/settings': 'Settings | SafeDose',
};

export default function SeoHead() {
  // The auth provider only mounts screens after initialization in the browser.
  // Keep metadata in the root layout so it is also present in the static export.
  const pathname = usePathname().replace(/\/$/, '') || '/';
  const metadata = getSeoMetadata(pathname);
  if (Platform.OS !== 'web') return null;
  if (!metadata) {
    const title = privateTitles[pathname];
    return title ? <Head><title>{title}</title></Head> : null;
  }

  const { title, description } = metadata;
  const url = canonicalUrl(pathname);
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="SafeDose" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
    </Head>
  );
}
