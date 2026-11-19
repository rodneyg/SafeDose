import { Link } from 'expo-router';
import HelpPage, { helpLinkStyle } from '../components/HelpPage';

export default function SupportPage() {
  return (
    <HelpPage
      title="SafeDose Support"
      backHref="/"
      backLabel="Back to SafeDose"
      description="Email SafeDose for help with your account, billing, or a problem using the app."
    >
      <Link href="mailto:rodney.gainous@gmail.com" style={helpLinkStyle}>Email SafeDose support</Link>
      <Link href="/reset-password" style={helpLinkStyle}>Get sign-in help</Link>
    </HelpPage>
  );
}
