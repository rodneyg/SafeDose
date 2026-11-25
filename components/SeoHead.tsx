import Head from 'expo-router/head';
import { canonicalUrl, OG_IMAGE_URL } from '../lib/seo';

type SeoHeadProps = { path: string; title: string; description: string };

export default function SeoHead({ path, title, description }: SeoHeadProps) {
  const url = canonicalUrl(path);
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
