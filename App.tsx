/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import nodejs from 'nodejs-mobile-react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';

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
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [urlToOpen, setUrlToOpen] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [whatsappInitialized, setWhatsappInitialized] = useState(false);
  const [hasDeepLink, setHasDeepLink] = useState(false);
  const [nodejsStarted, setNodejsStarted] = useState(false);
  const initialDeepLinkProcessed = useRef(false);
  // Use refs to always have latest state values in event listeners
  const whatsappInitializedRef = useRef(false);
  const isConnectedRef = useRef(false);

  // Parse deep link URL
  const parseDeepLink = (url: string): string | null => {
    try {
      console.log('[React Native] Parsing deep link:', url);
      if (!url || !url.includes('irisNative://')) {
        return null;
      }

      // Handle the case where openLink contains query parameters
      // Format: irisNative://?openLink=https://example.com?param1=value1&param2=value2
      // The openLink value itself may contain & characters, so we need to extract it carefully

      // Remove the scheme part
      const urlWithoutScheme = url.replace('irisNative://', '');

      // Check if there's a query string
      if (!urlWithoutScheme.startsWith('?')) {
        return null;
      }

      const queryString = urlWithoutScheme.substring(1); // Remove the '?'

      // Find the position of 'openLink='
      const openLinkIndex = queryString.indexOf('openLink=');
      if (openLinkIndex === -1) {
        console.log('[React Native] openLink parameter not found');
        return null;
      }

      // Extract everything after 'openLink='
      // Since openLink should be the only parameter (or the URL itself contains &),
      // we take everything after 'openLink='
      const openLinkValue = queryString.substring(
        openLinkIndex + 'openLink='.length,
      );

      // Decode the URL (it might be URL encoded)
      const decodedUrl = decodeURIComponent(openLinkValue);
      console.log('[React Native] Extracted openLink:', decodedUrl);
      console.log(
        '[React Native] Full decoded URL with query params:',
        decodedUrl,
      );

      return decodedUrl;
    } catch (error) {
      console.error('[React Native] Error parsing deep link:', error);
      return null;
    }
  };

  // Initialize WhatsApp/Node.js when deep link is received
  const initializeWhatsApp = () => {
    if (nodejsStarted) {
      console.log('[React Native] Node.js already started');
      // If Node.js is started but WhatsApp not initialized, trigger it
      if (!whatsappInitialized) {
        console.log('[React Native] Triggering WhatsApp initialization...');
        nodejs.channel.send({ type: 'start-whatsapp' });
      }
      return;
    }

    console.log('[React Native] Starting Node.js runtime for WhatsApp...');
    setNodejsStarted(true);
    nodejs.start('main.js');

    // Wait a bit for Node.js to initialize, then trigger WhatsApp
    setTimeout(() => {
      console.log('[React Native] Triggering WhatsApp initialization...');
      nodejs.channel.send({ type: 'start-whatsapp' });
    }, 1000);
  };

  // Handle deep link processing
  const processDeepLink = (url: string | null) => {
    if (!url) return;

    const openLink = parseDeepLink(url);
    if (!openLink) {
      console.log('[React Native] No openLink found in deep link');
      return;
    }

    console.log('[React Native] Processing deep link with openLink:', openLink);
    setHasDeepLink(true);

    // Initialize WhatsApp if not already started
    if (!nodejsStarted) {
      initializeWhatsApp();
    }

    // Use refs to get latest values (for event listener callbacks)
    const isInitialized = whatsappInitializedRef.current;
    const isConnectedNow = isConnectedRef.current;

    // Check if WhatsApp is initialized
    if (!isInitialized) {
      console.log(
        '[React Native] WhatsApp not initialized, will wait and store URL',
      );
      setPendingUrl(openLink);
      // WhatsApp initialization happens automatically when nodejs starts
      // We just need to wait for it
      return;
    }

    // Check if logged in
    if (isConnectedNow) {
      console.log(
        '[React Native] WhatsApp initialized and connected, opening new URL immediately',
      );
      // Clear any pending URL and open the new one
      setPendingUrl(null);
      setUrlToOpen(openLink);
      setShowWebView(true);
    } else {
      console.log(
        '[React Native] WhatsApp initialized but not connected, will show QR and wait for login',
      );
      setPendingUrl(openLink);
      // QR code will be shown automatically, and we'll open URL when connected
    }
  };

  // Process pending URL when WhatsApp becomes initialized
  useEffect(() => {
    if (whatsappInitialized && pendingUrl) {
      console.log(
        '[React Native] WhatsApp initialized, checking connection status for pending URL',
      );
      if (isConnected) {
        console.log('[React Native] Already connected, opening pending URL');
        setUrlToOpen(pendingUrl);
        setShowWebView(true);
        setPendingUrl(null);
      } else {
        console.log(
          '[React Native] Not connected yet, will wait for connection',
        );
        // QR code will be shown, and URL will open when connection is established
      }
    }
  }, [whatsappInitialized, isConnected, pendingUrl]);

  // Deep link handling
  useEffect(() => {
    // Handle deep link when app is opened via deep link (initial launch)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && !initialDeepLinkProcessed.current) {
        console.log('[React Native] App opened with deep link:', initialUrl);
        initialDeepLinkProcessed.current = true;
        processDeepLink(initialUrl);
      } else if (!initialUrl) {
        // No deep link on initial launch
        console.log('[React Native] App opened without deep link');
        setHasDeepLink(false);
      }
    };

    handleInitialURL();

    // Handle deep link when app is already running
    // This will be called every time a new deep link is received
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log(
        '[React Native] New deep link received while app is running:',
        url,
      );
      // Always process new deep links, even if app is already running
      // processDeepLink will use current state values via closure
      processDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only set up listeners if Node.js has been started (via deep link)
    if (!nodejsStarted) {
      return;
    }

    // Set up channel listeners
    nodejs.channel.addListener('message', msg => {
      console.log('[React Native] Received message from Node.js:', msg);
    });

    nodejs.channel.addListener('server-ready', data => {
      console.log('[React Native] Node.js server is ready:', data);
      // Mark WhatsApp as initialized when server is ready
      setWhatsappInitialized(true);
      whatsappInitializedRef.current = true;
    });

    // Listen for QR code
    nodejs.channel.addListener('baileys-qr', (data: { qr: string }) => {
      console.log('[React Native] QR Code received');
      setQrCode(data.qr);
      setIsConnected(false);
    });

    // Listen for connection status
    nodejs.channel.addListener(
      'baileys-connection',
      (data: { status: string }) => {
        console.log('[React Native] Baileys connection:', data.status);
        if (data.status === 'open') {
          setIsConnected(true);
          isConnectedRef.current = true;
          setQrCode(null); // Clear QR code when connected

          // If we have a pending URL, open it now
          if (pendingUrl) {
            console.log(
              '[React Native] Connected, opening pending URL:',
              pendingUrl,
            );
            setUrlToOpen(pendingUrl);
            setShowWebView(true);
            setPendingUrl(null);
          }
        } else {
          setIsConnected(false);
          isConnectedRef.current = false;
        }
      },
    );

    // Listen for message sent confirmation
    nodejs.channel.addListener(
      'message-sent',
      (data: { success: boolean; error?: string }) => {
        console.log('[React Native] Message sent result:', data);
        setIsSending(false);
        if (!data.success) {
          console.error('[React Native] Failed to send message:', data.error);
        }
      },
    );

    // Listen for errors
    nodejs.channel.addListener('baileys-error', (data: { error: string }) => {
      console.error('[React Native] Baileys error:', data.error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      // Note: nodejs-mobile-react-native channel doesn't have removeAllListeners
      // Listeners are automatically cleaned up when component unmounts
    };
  }, [pendingUrl, nodejsStarted]);

  const handleSendMessage = () => {
    console.log('[React Native] handleSendMessage called');
    setIsSending(true);
    const phoneNumber = '917389893567';
    const message = 'Hello from Baileys!';

    console.log('[React Native] Sending message:', { phoneNumber, message });

    // nodejs-mobile-react-native channel.send() sends to 'message' channel
    // So we need to wrap it in an object with type
    nodejs.channel.send({
      type: 'send-message',
      phoneNumber,
      message,
    });

    console.log('[React Native] Message sent to Node.js');
  };

  // If WebView should be shown, display it
  if (showWebView && urlToOpen) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <WebView
          source={{ uri: urlToOpen }}
          style={styles.webview}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[React Native] WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[React Native] WebView HTTP error:', nativeEvent);
          }}
        />
      </View>
    );
  }

  // Show message if no deep link
  if (!hasDeepLink) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <View style={styles.content}>
          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>⚠️ Deep Link Required</Text>
            <Text style={styles.messageText}>
              Please open this app using a deep link.{'\n\n'}
              The app only works when launched via:{'\n'}
              <Text style={styles.deeplinkExample}>
                irisNative://?openLink=https://...
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.content}>
        {!isConnected && qrCode && (
          <View style={styles.qrContainer}>
            <Text style={styles.title}>Scan QR Code to Connect</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrCode}
                size={250}
                backgroundColor="white"
                color="black"
              />
            </View>
            <Text style={styles.instruction}>
              Open WhatsApp and scan this QR code
            </Text>
            {pendingUrl && (
              <Text style={styles.pendingUrlText}>
                Waiting for login to open link...
              </Text>
            )}
          </View>
        )}

        {!isConnected && !qrCode && nodejsStarted && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#25D366" />
            <Text style={styles.loadingText}>Connecting to WhatsApp...</Text>
          </View>
        )}

        {isConnected && !showWebView && (
          <View style={styles.connectedContainer}>
            <Text style={styles.connectedTitle}>✅ Connected to WhatsApp</Text>
            <TouchableOpacity
              style={[
                styles.sendButton,
                isSending && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send Message to 917389893567
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  connectedContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 300,
  },
  connectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#25D366',
  },
  sendButton: {
    backgroundColor: '#25D366',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
  pendingUrlText: {
    marginTop: 15,
    fontSize: 14,
    color: '#25D366',
    fontStyle: 'italic',
  },
  messageContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 350,
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  deeplinkExample: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    fontSize: 14,
    color: '#333',
  },
});

export default App;
