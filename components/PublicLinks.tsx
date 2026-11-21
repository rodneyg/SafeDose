import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function PublicLinks({
  onDarkBackground = false,
  showChangelog = false,
}: {
  onDarkBackground?: boolean;
  showChangelog?: boolean;
}) {
  const linkStyle = [styles.link, onDarkBackground && styles.lightLink];

  return (
    <View style={styles.links}>
      <Link href="/terms" style={linkStyle}>Terms of Service</Link>
      <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
      <Link href="/support" style={linkStyle}>Support</Link>
      <Link href="/dosing-problem" style={linkStyle}>Understanding dosing</Link>
      {showChangelog && <Link href="/changelog" style={linkStyle}>Changelog</Link>}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16 },
  link: { color: '#1d4ed8', fontSize: 14, paddingVertical: 8, textDecorationLine: 'underline' },
  lightLink: { color: '#fff' },
});
