import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { initDB } from './utils/db';
import { SplashScreen } from 'expo-router';
import { ExpoRoot } from 'expo-router';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize database
        await initDB();
        
        // Add a small delay to ensure DB initialization completes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('Error initializing the app:', e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // Render the splash screen until the app is ready
  if (!isReady) {
    return <SplashScreen />;
  }

  // Use the ExpoRoot component to render the app using Expo Router
  return <ExpoRoot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    marginTop: 20,
  },
});