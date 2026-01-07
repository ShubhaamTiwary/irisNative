/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useEffect } from 'react';
import nodejs from 'nodejs-mobile-react-native';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  useEffect(() => {
    // Start the Node.js runtime
    nodejs.start('main.js');

    // Set up channel listeners
    nodejs.channel.addListener('message', (msg) => {
      console.log('[React Native] Received message from Node.js:', msg);
    });

    nodejs.channel.addListener('server-ready', (data) => {
      console.log('[React Native] Node.js server is ready:', data);
    });

    // Cleanup on unmount
    return () => {
      nodejs.channel.removeAllListeners('message');
      nodejs.channel.removeAllListeners('server-ready');
    };
  }, []);

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
