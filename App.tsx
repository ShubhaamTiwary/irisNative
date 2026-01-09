/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import nodejs from 'nodejs-mobile-react-native';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ConnectedView } from './components/ConnectedView';
import { DeepLinkMessage } from './components/DeepLinkMessage';
import { WebViewContainer } from './components/WebViewContainer';
import { useWhatsApp } from './hooks/useWhatsApp';
import { useDeepLink } from './hooks/useDeepLink';

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
  const [nodejsStarted, setNodejsStarted] = useState(false);

  // Note: Node.js initialization is handled in useDeepLink hook

  // Use custom hooks
  const {
    qrCode,
    isConnected,
    isSending,
    setIsSending,
    whatsappInitialized,
    isConnectedRef,
    sendMessage,
    logout,
    getPhoneNumber,
  } = useWhatsApp(nodejsStarted);

  const {
    hasDeepLink,
    pendingUrl,
    urlToOpen,
    showWebView,
    setShowWebView,
    setUrlToOpen,
    setPendingUrl,
  } = useDeepLink(
    nodejsStarted,
    setNodejsStarted,
    whatsappInitialized,
    isConnected,
    isConnectedRef,
  );

  // Expose API to global scope
  useEffect(() => {
    const api = { sendMessage, logout, getPhoneNumber };

    // eslint-disable-next-line no-undef
    (global as any).irisElectron = api;

    if (typeof (global as any).window === 'undefined') {
      (global as any).window = global;
    }
    (global as any).window.irisElectron = api;
  }, [sendMessage, logout, getPhoneNumber]);

  // Handle logout - close WebView and show QR
  // This is handled in useWhatsApp hook, but we need to close WebView here
  useEffect(() => {
    if (!nodejsStarted) return;

    nodejs.channel.addListener(
      'logout-complete',
      (data: { success: boolean; error?: string; requestId?: string }) => {
        if (data.success) {
          setShowWebView(false);
          setUrlToOpen(null);
          setPendingUrl(null);
        }
      },
    );
  }, [nodejsStarted, setShowWebView, setUrlToOpen, setPendingUrl]);

  const handleSendMessage = useCallback(async () => {
    console.log('[React Native] handleSendMessage called');
    setIsSending(true);
    const phoneNumber = '917389893567';
    const message = 'Hello from Baileys with Promise API!';

    try {
      console.log('[React Native] Sending message:', { phoneNumber, message });
      const result = await sendMessage({
        phone: phoneNumber,
        message,
      });
      console.log('[React Native] Message sent successfully via API:', result);
    } catch (error) {
      console.error('[React Native] Failed to send message via API:', error);
    } finally {
      setIsSending(false);
    }
  }, [sendMessage, setIsSending]);

  // Show WebView if URL is available
  if (showWebView && urlToOpen) {
    return (
      <WebViewContainer
        url={urlToOpen}
        onSendMessage={sendMessage}
        onLogout={logout}
        onGetPhoneNumber={getPhoneNumber}
      />
    );
  }

  // Show message if no deep link
  if (!hasDeepLink) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <View style={styles.content}>
          <DeepLinkMessage />
        </View>
      </View>
    );
  }

  // Main content view
  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.content}>
        {!isConnected && qrCode && (
          <QRCodeDisplay qrCode={qrCode} pendingUrl={pendingUrl} />
        )}

        {!isConnected && !qrCode && nodejsStarted && <LoadingIndicator />}

        {isConnected && !showWebView && (
          <ConnectedView
            isSending={isSending}
            onSendMessage={handleSendMessage}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default App;
