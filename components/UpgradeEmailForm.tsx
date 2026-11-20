import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getApiBaseUrl } from '../lib/apiBase';
import { normalizeUpgradeEmail } from '../lib/upgradeEmail';

export default function UpgradeEmailForm({
  getIdToken,
  onClose,
}: {
  getIdToken: () => Promise<string>;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const endpoint = `${getApiBaseUrl()}/api/upgrade-email`;

  useEffect(() => {
    let mounted = true;
    fetch(endpoint)
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json();
        if (mounted) setEnabled(result.enabled === true);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [endpoint]);

  async function submit() {
    if (pending.current) return;

    const address = normalizeUpgradeEmail(email);
    if (!address) {
      setError('Enter a valid email address.');
      return;
    }

    pending.current = true;
    setSubmitting(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const token = await getIdToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address }),
        signal: controller.signal,
      });
      if (response.status === 409) {
        setError('An email is already saved for this session.');
        return;
      }
      if (response.status !== 204) throw new Error('Save failed');
      setEmail('');
      setSubmitted(true);
    } catch {
      setError('Could not save your email. Try again.');
    } finally {
      clearTimeout(timeout);
      pending.current = false;
      setSubmitting(false);
    }
  }

  if (!enabled) return null;
  if (submitted) {
    return <Text accessibilityRole="alert" style={styles.form}>Thanks. We saved your email for SafeDose updates.</Text>;
  }

  return (
    <View style={styles.form}>
      <Text style={styles.copy}>
        Optional. Choose “Save my email” to get SafeDose updates by email.{' '}
        <Link href="/privacy" onPress={onClose} style={styles.link}>Privacy Policy</Link>
      </Text>
      <TextInput
        accessibilityLabel="Email address"
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        editable={!submitting}
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={submit}
        style={styles.input}
      />
      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
        disabled={submitting}
        onPress={submit}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Save my email'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: '100%', marginTop: 16 },
  copy: { color: '#333333', fontSize: 14, lineHeight: 20 },
  link: { color: '#004C99', textDecorationLine: 'underline' },
  input: {
    borderColor: '#767676',
    borderWidth: 1,
    borderRadius: 8,
    color: '#000000',
    padding: 10,
    marginVertical: 8,
  },
  error: { color: '#A12622', marginBottom: 8 },
  button: {
    alignItems: 'center',
    borderColor: '#004C99',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  buttonText: { color: '#004C99', fontWeight: '600' },
});
