import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getInjectedJavaScript } from '../utils/injectedJavaScript';

interface WebViewContainerProps {
  url: string;
  onSendMessage: (data: {
    phone: string;
    message: string;
    document?: { data: string; mimeType: string; filename: string };
  }) => Promise<any>;
  onLogout: () => Promise<any>;
  onGetPhoneNumber: () => Promise<string>;
}

export const WebViewContainer: React.FC<WebViewContainerProps> = ({
  url,
  onSendMessage,
  onLogout,
  onGetPhoneNumber,
}) => {
  const safeAreaInsets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'sendMessage') {
        console.log(
          '[React Native] Received sendMessage from WebView:',
          message.data,
        );

        let result;
        try {
          const response = await onSendMessage(message.data);
          result = {
            success: true,
            ...(response || {}),
            requestId: message.requestId,
          };
        } catch (error: any) {
          console.error(
            '[React Native] Error sending message from WebView:',
            error,
          );
          result = {
            success: false,
            error: error.message || String(error),
            requestId: message.requestId,
          };
        }

        sendResponseToWebView(message.requestId, result);
      } else if (message.type === 'logout') {
        console.log('[React Native] Received logout request from WebView');

        let result;
        try {
          const response = await onLogout();
          result = {
            success: true,
            ...(response || {}),
            requestId: message.requestId,
          };
        } catch (error: any) {
          console.error(
            '[React Native] Error logging out from WebView:',
            error,
          );
          result = {
            success: false,
            error: error.message || String(error),
            requestId: message.requestId,
          };
        }

        sendResponseToWebView(message.requestId, result);
      } else if (message.type === 'getPhoneNumber') {
        console.log(
          '[React Native] Received getPhoneNumber request from WebView',
        );

        let result;
        try {
          const phoneNumber = await onGetPhoneNumber();
          result = {
            success: true,
            phoneNumber: phoneNumber,
            requestId: message.requestId,
          };
        } catch (error: any) {
          console.error(
            '[React Native] Error getting phone number from WebView:',
            error,
          );
          result = {
            success: false,
            error: error.message || String(error),
            requestId: message.requestId,
          };
        }

        sendResponseToWebView(message.requestId, result, true);
      }
    } catch (e) {
      console.error('[React Native] Error parsing WebView message:', e);
    }
  };

  const sendResponseToWebView = (
    requestId: string,
    result: any,
    isPhoneNumber = false,
  ) => {
    const responseScript = `
      if (window.irisPendingRequests && window.irisPendingRequests['${requestId}']) {
        const req = window.irisPendingRequests['${requestId}'];
        delete window.irisPendingRequests['${requestId}'];
        if (${result.success}) {
          ${
            isPhoneNumber
              ? `req.resolve(${JSON.stringify(result.phoneNumber)});`
              : `req.resolve(${JSON.stringify(result)});`
          }
        } else {
          req.reject(new Error(${JSON.stringify(
            (result as any).error || 'Unknown error',
          )}));
        }
      }
    `;

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(responseScript);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <WebView
        key={url}
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={getInjectedJavaScript()}
        onMessage={handleMessage}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
  },
});
