const http = require('http');
const rn_bridge = require('rn-bridge');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

// Log that the Node.js runtime is starting
console.log('[node] Node.js runtime is starting...');
console.log('[node] Node version:', process.version);

// Polyfill Web Crypto API for Baileys
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  console.log('[node] Setting up Web Crypto API polyfill...');
  try {
    // Try to use Node.js built-in webcrypto (Node 15+)
    const { webcrypto } = require('crypto');
    if (webcrypto && webcrypto.subtle) {
      globalThis.crypto = webcrypto;
      console.log('[node] Using Node.js built-in webcrypto');
    } else {
      throw new Error('webcrypto not available');
    }
  } catch (err) {
    console.log(
      '[node] Node.js webcrypto not available, installing @peculiar/webcrypto...',
    );
    // Install and use @peculiar/webcrypto as fallback
    try {
      const { Crypto } = require('@peculiar/webcrypto');
      globalThis.crypto = new Crypto();
      console.log('[node] Using @peculiar/webcrypto polyfill');
    } catch (polyfillErr) {
      console.error(
        '[node] Failed to load crypto polyfill:',
        polyfillErr.message,
      );
      console.log('[node] Attempting to continue with basic polyfill...');
      // Minimal polyfill - may not work fully but will help with initialization
      if (!globalThis.crypto) {
        globalThis.crypto = {
          getRandomValues: arr => {
            const randomBytes = crypto.randomBytes(arr.length);
            for (let i = 0; i < arr.length; i++) {
              arr[i] = randomBytes[i];
            }
            return arr;
          },
        };
      }
    }
  }
} else {
  console.log('[node] Web Crypto API already available');
}

// Create a simple HTTP server
const PORT = 3000;
const server = http.createServer((req, res) => {
  console.log(`[node] Received ${req.method} request to ${req.url}`);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Simple routing
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: 'Hello from Node.js Mobile!',
        timestamp: new Date().toISOString(),
      }),
    );
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`[node] HTTP server is listening on port ${PORT}`);

  // Notify React Native that the server is ready
  rn_bridge.channel.post('server-ready', { port: PORT });
});

// Global socket instance for Baileys
let baileysSocket = null;
let isInitializing = false;
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 2000; // 2 seconds

// Cleanup function for Baileys
function cleanupBaileys() {
  if (baileysSocket) {
    console.log('[node] Cleaning up Baileys socket...');
    try {
      baileysSocket.end();
    } catch (err) {
      console.error('[node] Error closing socket:', err);
    }
    baileysSocket = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  isInitializing = false;
}

// Baileys Integration
async function startBaileys() {
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log(
      '[node] Baileys initialization already in progress, skipping...',
    );
    return;
  }

  // If socket already exists and is connected, don't reinitialize
  if (baileysSocket) {
    console.log(
      '[node] Baileys socket already exists, skipping initialization',
    );
    return;
  }

  isInitializing = true;
  console.log('[node] Starting Baileys integration...');

  try {
    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
    } = await import('baileys');

    console.log('[node] Baileys module loaded successfully');

    // Create absolute path for auth info directory
    const authInfoPath = path.join(__dirname, 'baileys_auth_info');

    // Ensure the directory exists
    if (!fs.existsSync(authInfoPath)) {
      console.log('[node] Creating auth info directory:', authInfoPath);
      fs.mkdirSync(authInfoPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

    // Log if we're restoring an existing session
    if (state.creds && state.creds.me) {
      console.log(
        '[node] Restoring existing WhatsApp session for:',
        state.creds.me.id || 'Unknown',
      );
    } else {
      console.log('[node] No existing session found, will require QR scan');
    }

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Cannot print to terminal in mobile environment easily
      logger: require('pino')({ level: 'silent' }), // Reduce logging to prevent spam
    });

    // Store socket globally
    baileysSocket = sock;
    isInitializing = false;
    reconnectAttempts = 0; // Reset reconnect attempts on successful initialization

    sock.ev.on('connection.update', update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('[node] QR Code received');
        // Send QR to React Native if needed
        rn_bridge.channel.post('baileys-qr', { qr });
      }

      if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;

        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
        console.log(
          '[node] Connection closed due to',
          errorMessage,
          ', should reconnect:',
          shouldReconnect,
        );

        // Clear the socket reference
        baileysSocket = null;
        isInitializing = false;

        if (shouldReconnect) {
          reconnectAttempts++;

          // Check if we've exceeded max reconnect attempts
          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error(
              '[node] Max reconnect attempts reached, stopping reconnection',
            );
            rn_bridge.channel.post('baileys-error', {
              error: 'Max reconnect attempts reached',
            });
            return;
          }

          // Calculate exponential backoff delay (capped at 30 seconds)
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
            30000,
          );

          console.log(
            `[node] Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`,
          );

          // Clear any existing timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          // Schedule reconnection with delay
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            startBaileys();
          }, delay);
        } else {
          console.log(
            '[node] Not reconnecting (logged out or should not reconnect)',
          );
        }
      } else if (connection === 'open') {
        console.log('[node] Baileys connection opened successfully');
        reconnectAttempts = 0; // Reset on successful connection
        rn_bridge.channel.post('baileys-connection', { status: 'open' });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    console.log('[node] Baileys socket initialized');
  } catch (err) {
    isInitializing = false;
    console.error('[node] Failed to start Baileys:', err);
    rn_bridge.channel.post('baileys-error', { error: err.message });

    // Don't retry immediately on initialization errors
    // Only retry on connection close events
  }
}

// Don't auto-start Baileys - wait for explicit request from React Native
// startBaileys() will be called when a deep link is received

// Shared message sending logic
async function handleSendMessage(data) {
  const requestId = data.requestId;

  if (!baileysSocket) {
    console.error('[node] Baileys socket not initialized');
    rn_bridge.channel.post('message-sent', {
      success: false,
      error: 'Socket not initialized',
      requestId,
    });
    return;
  }

  try {
    // Support both new 'phone' and old 'phoneNumber' for backward compatibility
    const phone = data.phone || data.phoneNumber;
    const { message, document } = data;

    console.log('[node] Extracted phone:', phone);
    console.log('[node] Extracted message:', message);
    if (document) {
      console.log('[node] Document present:', {
        mimeType: document.mimeType,
        filename: document.filename,
        dataLength: document.data ? document.data.length : 0,
      });
    }

    if (!phone) {
      throw new Error('Missing phone number');
    }

    if (!message && !document) {
      throw new Error('Message must contain text or document');
    }

    // Format phone number (add @s.whatsapp.net if not present)
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

    console.log('[node] Formatted JID:', jid);
    console.log('[node] Attempting to send message...');

    // Prepare message content
    let messageContent = {};

    if (document) {
      // Handle document sending
      if (!document.data) {
        throw new Error('Document data is missing');
      }

      // Convert base64 to Buffer
      const buffer = Buffer.from(document.data, 'base64');

      messageContent = {
        document: buffer,
        mimetype: document.mimeType || 'application/octet-stream',
        fileName: document.filename || 'file',
        caption: message || '', // Add text as caption if present
      };
    } else {
      // Handle text only
      messageContent = { text: message };
    }

    // Send message using Baileys
    await baileysSocket.sendMessage(jid, messageContent);

    console.log('[node] Message sent successfully to', jid);
    rn_bridge.channel.post('message-sent', {
      success: true,
      phone,
      message,
      requestId,
    });
  } catch (err) {
    console.error('[node] Failed to send message:', err);
    console.error('[node] Error stack:', err.stack);
    rn_bridge.channel.post('message-sent', {
      success: false,
      error: err.message || String(err),
      requestId,
    });
  }
}

// Handle messages from React Native
rn_bridge.channel.on('message', async msg => {
  console.log('[node] Received message from React Native:', msg);
  console.log('[node] Message type:', typeof msg);
  console.log(
    '[node] Message keys:',
    msg && typeof msg === 'object' ? Object.keys(msg) : 'N/A',
  );

  // Check if this is a start-whatsapp command
  if (msg && typeof msg === 'object' && msg.type === 'start-whatsapp') {
    console.log('[node] Starting WhatsApp initialization requested');
    if (!baileysSocket && !isInitializing) {
      startBaileys();
    } else {
      console.log('[node] WhatsApp already initialized or initializing');
    }
    return;
  }

  // Check if this is a send-message command
  if (msg && typeof msg === 'object' && msg.type === 'send-message') {
    console.log('[node] Routing send-message command from message channel');
    await handleSendMessage(msg);
    return;
  }

  // Echo other messages back
  rn_bridge.channel.post('message', {
    echo: msg,
    timestamp: new Date().toISOString(),
  });
});

// Handle send-message command from React Native
// Note: nodejs-mobile-react-native channel.send() sends to 'message' channel
// So we'll handle it in the message handler and route based on message type
rn_bridge.channel.on('send-message', async data => {
  console.log('[node] Received send-message request (direct):', data);
  await handleSendMessage(data);
});

// Handle app lifecycle events
rn_bridge.app.on('pause', pauseLock => {
  console.log('[node] App paused - session will be preserved');
  // Don't close the socket, just let it stay connected
  // The session is already saved via saveCreds on creds.update events
  // Credentials are persisted in baileys_auth_info directory
  pauseLock.release();
});

rn_bridge.app.on('resume', () => {
  console.log('[node] App resumed');
  // If socket exists and was connected, Baileys will handle reconnection automatically
  // If socket doesn't exist, we'll wait for a deep link to reinitialize
  // The saved session will be restored automatically when startBaileys() is called
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('[node] SIGTERM received, shutting down gracefully');
  cleanupBaileys();
  server.close(() => {
    console.log('[node] HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', err => {
  console.error('[node] Uncaught exception:', err);
  // Don't exit - just log the error to preserve session
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[node] Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit - just log the error to preserve session
});

console.log('[node] Node.js runtime initialized');
