import { Link } from 'expo-router';
import HelpPage, { helpLinkStyle } from '../components/HelpPage';

export default function ResetPasswordPage() {
  return (
    <HelpPage
      title="Reset your password"
      backHref="/login"
      backLabel="Back to sign in"
      description="SafeDose uses Google sign-in. Recover your Google Account or reset its password with Google, then return to SafeDose to sign in."
    >
      <Link href="https://accounts.google.com/signin/recovery" style={helpLinkStyle}>Recover your Google Account</Link>
    </HelpPage>
  );
}
