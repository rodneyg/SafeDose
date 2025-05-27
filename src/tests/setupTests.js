// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn().mockReturnValue({
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn()
  })
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn()
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    getAuth: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signInWithCredential: jest.fn(),
    linkWithCredential: jest.fn(),
    EmailAuthProvider: {
      credential: jest.fn().mockReturnValue('mock-email-credential')
    },
    GoogleAuthProvider: {
      credential: jest.fn().mockReturnValue('mock-google-credential')
    }
  };
});

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn()
}));

// Mock expo-auth-session/providers/google
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn().mockReturnValue([
    {}, // request
    null, // response (will be set in tests)
    jest.fn() // promptAsync
  ])
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      firebase: {
        apiKey: 'mock-api-key',
        authDomain: 'mock-auth-domain',
        projectId: 'mock-project-id',
        storageBucket: 'mock-storage-bucket',
        messagingSenderId: 'mock-messaging-sender-id',
        appId: 'mock-app-id',
        measurementId: 'mock-measurement-id'
      }
    }
  }
}));