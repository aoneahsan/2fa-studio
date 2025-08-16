/**
 * Mock Firebase configuration for development/testing
 * This prevents Firebase initialization errors when using test API keys
 */

export const createMockFirebaseApp = () => {
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: (callback: Function) => {
      callback(null);
      return () => {};
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Mock Firebase: Authentication not available in test mode')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Mock Firebase: Authentication not available in test mode')),
    signOut: () => Promise.resolve(),
  };

  const mockFirestore = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        onSnapshot: () => () => {},
      }),
      add: () => Promise.resolve({ id: 'mock-id' }),
      get: () => Promise.resolve({ docs: [] }),
      onSnapshot: () => () => {},
    }),
  };

  const mockStorage = {
    ref: () => ({
      put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } }),
      getDownloadURL: () => Promise.resolve('mock-url'),
      delete: () => Promise.resolve(),
    }),
  };

  const mockAnalytics = {
    logEvent: () => {},
    setUserId: () => {},
    setUserProperties: () => {},
  };

  return {
    auth: () => mockAuth,
    firestore: () => mockFirestore,
    storage: () => mockStorage,
    analytics: () => mockAnalytics,
  };
};

export const isMockFirebase = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return !apiKey || apiKey.includes('test') || apiKey.includes('mock');
};