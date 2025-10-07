// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Define the fallback component BEFORE the error boundary class that uses it
const OnboardingErrorFallback = React.memo(({ error, onRetry }: { error: Error | null; onRetry: () => void }) => {
  const router = useRouter();
  
  React.useEffect(() => {
    console.error('[OnboardingErrorFallback] Rendering error fallback for:', error?.message);
  }, [error]);

  const handleGoHome = React.useCallback(() => {
    console.log('[OnboardingErrorFallback] Navigating to home');
    try {
      router.replace('/');
    } catch (err) {
      console.error('[OnboardingErrorFallback] Failed to navigate home:', err);
    }
  }, [router]);

  const handleRetry = React.useCallback(() => {
    console.log('[OnboardingErrorFallback] Retrying onboarding');
    onRetry();
  }, [onRetry]);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>
        We encountered an issue while loading the onboarding screen.
      </Text>
      {error && (
        <Text style={styles.errorDetails}>
          Error: {error.message}
        </Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.debugInfo}>
        If this issue persists, please report it with this error message.
      </Text>
    </View>
  );
});

class OnboardingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[OnboardingErrorBoundary] Error caught:', error);
    console.error('[OnboardingErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <OnboardingErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

export default function OnboardingLayout() {
  return (
    <OnboardingErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="age" options={{ headerShown: false }} />
        <Stack.Screen name="child-safety" options={{ headerShown: false }} />
        <Stack.Screen name="demo" options={{ headerShown: false }} />
        <Stack.Screen name="features" options={{ headerShown: false }} />
        <Stack.Screen name="userType" options={{ headerShown: false }} />
        <Stack.Screen name="protocol" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </OnboardingErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'monospace',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});