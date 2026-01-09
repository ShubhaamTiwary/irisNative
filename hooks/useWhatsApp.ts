import { useState, useRef, useCallback, useEffect } from 'react';
import nodejs from 'nodejs-mobile-react-native';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export const useWhatsApp = (nodejsStarted: boolean) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [whatsappInitialized, setWhatsappInitialized] = useState(false);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const whatsappInitializedRef = useRef(false);
  const isConnectedRef = useRef(false);

  // Set up WhatsApp event listeners
  useEffect(() => {
    if (!nodejsStarted) {
      return;
    }

    nodejs.channel.addListener('server-ready', data => {
      console.log('[React Native] Node.js server is ready:', data);
      setWhatsappInitialized(true);
      whatsappInitializedRef.current = true;
    });

    nodejs.channel.addListener('baileys-qr', (data: { qr: string }) => {
      console.log('[React Native] QR Code received');
      setQrCode(data.qr);
      setIsConnected(false);
    });

    nodejs.channel.addListener(
      'baileys-connection',
      (data: { status: string }) => {
        console.log('[React Native] Baileys connection:', data.status);
        if (data.status === 'open') {
          setIsConnected(true);
          isConnectedRef.current = true;
          setQrCode(null);
        } else {
          setIsConnected(false);
          isConnectedRef.current = false;
        }
      },
    );

    nodejs.channel.addListener(
      'message-sent',
      (data: { success: boolean; error?: string; requestId?: string }) => {
        console.log('[React Native] Message sent result:', data);
        setIsSending(false);

        if (data.requestId && pendingRequests.current.has(data.requestId)) {
          const { resolve, reject } = pendingRequests.current.get(
            data.requestId,
          )!;
          if (data.success) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Unknown error'));
          }
          pendingRequests.current.delete(data.requestId);
        } else if (!data.success) {
          console.error('[React Native] Failed to send message:', data.error);
        }
      },
    );

    nodejs.channel.addListener(
      'logout-complete',
      (data: { success: boolean; error?: string; requestId?: string }) => {
        console.log('[React Native] Logout result:', data);

        if (data.requestId && pendingRequests.current.has(data.requestId)) {
          const { resolve, reject } = pendingRequests.current.get(
            data.requestId,
          )!;
          if (data.success) {
            setIsConnected(false);
            isConnectedRef.current = false;
            setWhatsappInitialized(false);
            whatsappInitializedRef.current = false;
            setQrCode(null);

            // Restart WhatsApp to generate new QR code
            setTimeout(() => {
              if (nodejsStarted) {
                nodejs.channel.send({ type: 'start-whatsapp' });
              }
            }, 500);
            resolve(data);
          } else {
            reject(new Error(data.error || 'Unknown error'));
          }
          pendingRequests.current.delete(data.requestId);
        } else if (!data.success) {
          console.error('[React Native] Failed to logout:', data.error);
        }
      },
    );

    nodejs.channel.addListener(
      'phone-number',
      (data: {
        success: boolean;
        phoneNumber?: string;
        error?: string;
        requestId?: string;
      }) => {
        console.log('[React Native] Phone number result:', data);

        if (data.requestId && pendingRequests.current.has(data.requestId)) {
          const { resolve, reject } = pendingRequests.current.get(
            data.requestId,
          )!;
          if (data.success && data.phoneNumber) {
            resolve(data.phoneNumber);
          } else {
            reject(new Error(data.error || 'Unknown error'));
          }
          pendingRequests.current.delete(data.requestId);
        } else if (!data.success) {
          console.error(
            '[React Native] Failed to get phone number:',
            data.error,
          );
        }
      },
    );

    nodejs.channel.addListener('baileys-error', (data: { error: string }) => {
      console.error('[React Native] Baileys error:', data.error);
      setIsConnected(false);
    });
  }, [nodejsStarted]);

  const sendMessage = useCallback(
    async (data: {
      phone: string;
      message: string;
      document?: { data: string; mimeType: string; filename: string };
    }) => {
      return new Promise((resolve, reject) => {
        if (!nodejsStarted) {
          reject(new Error('Node.js runtime not started'));
          return;
        }

        const requestId = Date.now().toString() + Math.random().toString();
        pendingRequests.current.set(requestId, { resolve, reject });

        nodejs.channel.post('send-message', {
          ...data,
          requestId,
        });

        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            const req = pendingRequests.current.get(requestId);
            if (req) {
              req.reject(new Error('Request timed out'));
            }
            pendingRequests.current.delete(requestId);
          }
        }, 30000);
      });
    },
    [nodejsStarted],
  );

  const logout = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!nodejsStarted) {
        reject(new Error('Node.js runtime not started'));
        return;
      }

      const requestId = Date.now().toString() + Math.random().toString();
      pendingRequests.current.set(requestId, { resolve, reject });

      nodejs.channel.post('logout', {
        requestId,
      });

      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          const req = pendingRequests.current.get(requestId);
          if (req) {
            req.reject(new Error('Request timed out'));
          }
          pendingRequests.current.delete(requestId);
        }
      }, 30000);
    });
  }, [nodejsStarted]);

  const getPhoneNumber = useCallback(async () => {
    return new Promise<string>((resolve, reject) => {
      if (!nodejsStarted) {
        reject(new Error('Node.js runtime not started'));
        return;
      }

      const requestId = Date.now().toString() + Math.random().toString();
      pendingRequests.current.set(requestId, { resolve, reject });

      nodejs.channel.post('get-phone-number', {
        requestId,
      });

      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          const req = pendingRequests.current.get(requestId);
          if (req) {
            req.reject(new Error('Request timed out'));
          }
          pendingRequests.current.delete(requestId);
        }
      }, 30000);
    });
  }, [nodejsStarted]);

  return {
    qrCode,
    isConnected,
    isSending,
    setIsSending,
    whatsappInitialized,
    isConnectedRef,
    sendMessage,
    logout,
    getPhoneNumber,
  };
};

