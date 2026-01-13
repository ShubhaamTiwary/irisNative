import { useState, useRef, useEffect, useCallback } from 'react';
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import nodejs from 'nodejs-mobile-react-native';
import { parseDeepLink } from '../utils/deepLinkParser';
import { getNativeInitialURL } from '../utils/intentModule';

export const useDeepLink = (
  nodejsStarted: boolean,
  setNodejsStarted: (value: boolean) => void,
  whatsappInitialized: boolean,
  isConnected: boolean,
  _isConnectedRef: React.MutableRefObject<boolean>,
) => {
  const [hasDeepLink, setHasDeepLink] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [urlToOpen, setUrlToOpen] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const initialDeepLinkProcessed = useRef(false);
  const lastProcessedUrl = useRef<string | null>(null);

  const initializeWhatsApp = useCallback(() => {
    if (nodejsStarted) {
      console.log('[React Native] Node.js already started');
      if (!whatsappInitialized) {
        console.log('[React Native] Triggering WhatsApp initialization...');
        nodejs.channel.send({ type: 'start-whatsapp' });
      }
      return;
    }

    console.log('[React Native] Starting Node.js runtime for WhatsApp...');
    setNodejsStarted(true);
    nodejs.start('main.js');

    setTimeout(() => {
      console.log('[React Native] Triggering WhatsApp initialization...');
      nodejs.channel.send({ type: 'start-whatsapp' });
    }, 1000);
  }, [nodejsStarted, whatsappInitialized, setNodejsStarted]);

  const processDeepLink = useCallback(
    (url: string | null, forceUpdate: boolean = false) => {
      if (!url) return;

      // Skip if we've already processed this exact URL (unless forced)
      if (!forceUpdate && lastProcessedUrl.current === url) {
        console.log('[React Native] URL already processed, skipping:', url);
        return;
      }

      const openLink = parseDeepLink(url);
      if (!openLink) {
        console.log('[React Native] No openLink found in deep link');
        return;
      }

      console.log(
        '[React Native] Processing deep link with openLink:',
        openLink,
      );
      setHasDeepLink(true);
      lastProcessedUrl.current = url;

      if (!nodejsStarted) {
        initializeWhatsApp();
      }

      if (!whatsappInitialized) {
        console.log(
          '[React Native] WhatsApp not initialized, will wait and store URL',
        );
        setPendingUrl(openLink);
        return;
      }

      if (isConnected) {
        console.log(
          '[React Native] WhatsApp initialized and connected, opening new URL immediately',
        );
        setPendingUrl(null);
        setUrlToOpen(openLink);
        setShowWebView(true);
      } else {
        console.log(
          '[React Native] WhatsApp initialized but not connected, will show QR and wait for login',
        );
        setPendingUrl(openLink);
      }
    },
    [nodejsStarted, whatsappInitialized, isConnected, initializeWhatsApp],
  );

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
      }
    }
  }, [whatsappInitialized, isConnected, pendingUrl]);

  // Deep link handling
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        // Try native module first (more reliable on ChromeOS/Android)
        let initialUrl: string | null = null;

        // First attempt: Use native module
        try {
          initialUrl = await getNativeInitialURL();
          console.log('[React Native] Native module initial URL:', initialUrl);
        } catch (error) {
          console.log('[React Native] Native module error:', error);
        }

        // Fallback: Try React Native Linking with retries
        if (!initialUrl) {
          const maxRetries = 5;
          for (let i = 0; i < maxRetries; i++) {
            initialUrl = await Linking.getInitialURL();
            console.log(
              `[React Native] Linking.getInitialURL() check (attempt ${
                i + 1
              }):`,
              initialUrl,
            );

            if (initialUrl) {
              break;
            }

            // Wait before retrying (increasing delay)
            if (i < maxRetries - 1) {
              await new Promise<void>(resolve =>
                setTimeout(resolve, 200 * (i + 1)),
              );
            }
          }
        }

        if (initialUrl) {
          console.log('[React Native] App opened with deep link:', initialUrl);
          if (!initialDeepLinkProcessed.current) {
            initialDeepLinkProcessed.current = true;
            processDeepLink(initialUrl);
          }
        } else {
          console.log('[React Native] App opened without deep link');
          setHasDeepLink(false);
        }
      } catch (error) {
        console.error('[React Native] Error getting initial URL:', error);
        setHasDeepLink(false);
      }
    };

    // Start checking immediately
    handleInitialURL();

    // Also check after a delay as a fallback (for ChromeOS timing issues)
    const fallbackTimeout = setTimeout(() => {
      if (!initialDeepLinkProcessed.current) {
        console.log('[React Native] Fallback: Re-checking initial URL');
        handleInitialURL();
      }
    }, 1000);

    // Also check after a longer delay (ChromeOS can be slow)
    const longFallbackTimeout = setTimeout(() => {
      if (!initialDeepLinkProcessed.current) {
        console.log('[React Native] Long fallback: Re-checking initial URL');
        handleInitialURL();
      }
    }, 3000);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log(
        '[React Native] New deep link received while app is running (Linking event):',
        url,
      );
      processDeepLink(url, true);
    });

    // Listen for native intent events (for ChromeOS compatibility)
    let nativeEventEmitter: NativeEventEmitter | null = null;
    let nativeSubscription: any = null;

    try {
      if (NativeModules.IntentModule) {
        nativeEventEmitter = new NativeEventEmitter(NativeModules.IntentModule);
        nativeSubscription = nativeEventEmitter.addListener(
          'newIntent',
          (event: { url: string }) => {
            console.log(
              '[React Native] New deep link received while app is running (native event):',
              event.url,
            );
            processDeepLink(event.url, true);
          },
        );
        console.log('[React Native] Registered native intent event listener');
      }
    } catch (error) {
      console.log(
        '[React Native] Could not register native intent listener:',
        error,
      );
    }

    return () => {
      clearTimeout(fallbackTimeout);
      clearTimeout(longFallbackTimeout);
      subscription.remove();
      if (nativeSubscription) {
        nativeSubscription.remove();
      }
    };
  }, [processDeepLink]);

  // Handle connection and pending URL
  useEffect(() => {
    if (isConnected && pendingUrl) {
      console.log('[React Native] Connected, opening pending URL:', pendingUrl);
      setUrlToOpen(pendingUrl);
      setShowWebView(true);
      setPendingUrl(null);
    }
  }, [isConnected, pendingUrl]);

  return {
    hasDeepLink,
    pendingUrl,
    urlToOpen,
    showWebView,
    setShowWebView,
    setUrlToOpen,
    setPendingUrl,
  };
};
