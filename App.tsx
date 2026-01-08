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
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import nodejs from 'nodejs-mobile-react-native';
import QRCode from 'react-native-qrcode-svg';

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

  useEffect(() => {
    // Start the Node.js runtime
    nodejs.start('main.js');

    // Set up channel listeners
    nodejs.channel.addListener('message', msg => {
      console.log('[React Native] Received message from Node.js:', msg);
    });

    nodejs.channel.addListener('server-ready', data => {
      console.log('[React Native] Node.js server is ready:', data);
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
          setQrCode(null); // Clear QR code when connected
        } else {
          setIsConnected(false);
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
      nodejs.channel.removeAllListeners('message');
      nodejs.channel.removeAllListeners('server-ready');
      nodejs.channel.removeAllListeners('baileys-qr');
      nodejs.channel.removeAllListeners('baileys-connection');
      nodejs.channel.removeAllListeners('message-sent');
      nodejs.channel.removeAllListeners('baileys-error');
    };
  }, []);

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
          </View>
        )}

        {!isConnected && !qrCode && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#25D366" />
            <Text style={styles.loadingText}>Connecting to WhatsApp...</Text>
          </View>
        )}

        {isConnected && (
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
});

export default App;
