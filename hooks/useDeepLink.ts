import { useState, useRef, useEffect } from 'react';
import { Linking } from 'react-native';
import nodejs from 'nodejs-mobile-react-native';
import { parseDeepLink } from '../utils/deepLinkParser';

export const useDeepLink = (
  nodejsStarted: boolean,
  setNodejsStarted: (value: boolean) => void,
  whatsappInitialized: boolean,
  isConnected: boolean,
  isConnectedRef: React.MutableRefObject<boolean>,
) => {
  const [hasDeepLink, setHasDeepLink] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [urlToOpen, setUrlToOpen] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const initialDeepLinkProcessed = useRef(false);

  const initializeWhatsApp = () => {
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
  };

  const processDeepLink = (url: string | null) => {
    if (!url) return;

    const openLink = parseDeepLink(url);
    if (!openLink) {
      console.log('[React Native] No openLink found in deep link');
      return;
    }

    console.log('[React Native] Processing deep link with openLink:', openLink);
    setHasDeepLink(true);

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
      }
    }
  }, [whatsappInitialized, isConnected, pendingUrl]);

  // Deep link handling
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('[React Native] Initial URL check:', initialUrl);

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

    const timeoutId = setTimeout(() => {
      handleInitialURL();
    }, 100);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log(
        '[React Native] New deep link received while app is running:',
        url,
      );
      processDeepLink(url);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.remove();
    };
  }, []);

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

