const http = require('http');
const rn_bridge = require('rn-bridge');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

// Baileys Integration
async function startBaileys() {
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

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Cannot print to terminal in mobile environment easily
      logger: require('pino')({ level: 'debug' }), // Using pino as recommended
    });

    // Store socket globally
    baileysSocket = sock;

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
        console.log(
          '[node] Connection closed due to ',
          lastDisconnect?.error,
          ', reconnecting ',
          shouldReconnect,
        );
        baileysSocket = null; // Clear socket on close
        if (shouldReconnect) {
          startBaileys();
        }
      } else if (connection === 'open') {
        console.log('[node] Baileys connection opened successfully');
        rn_bridge.channel.post('baileys-connection', { status: 'open' });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    console.log('[node] Baileys socket initialized');
  } catch (err) {
    console.error('[node] Failed to start Baileys:', err);
    rn_bridge.channel.post('baileys-error', { error: err.message });
  }
}

// Start Baileys
startBaileys();

// Handle messages from React Native
rn_bridge.channel.on('message', async msg => {
  console.log('[node] Received message from React Native:', msg);
  console.log('[node] Message type:', typeof msg);
  console.log(
    '[node] Message keys:',
    msg && typeof msg === 'object' ? Object.keys(msg) : 'N/A',
  );

  // Check if this is a send-message command
  if (msg && typeof msg === 'object' && msg.type === 'send-message') {
    console.log('[node] Routing send-message command from message channel');

    if (!baileysSocket) {
      console.error('[node] Baileys socket not initialized');
      rn_bridge.channel.post('message-sent', {
        success: false,
        error: 'Socket not initialized',
      });
      return;
    }

    try {
      const { phoneNumber, message } = msg;
      console.log('[node] Extracted phoneNumber:', phoneNumber);
      console.log('[node] Extracted message:', message);

      if (!phoneNumber || !message) {
        throw new Error('Missing phoneNumber or message in data');
      }

      // Format phone number (add @s.whatsapp.net if not present)
      const jid = phoneNumber.includes('@')
        ? phoneNumber
        : `${phoneNumber}@s.whatsapp.net`;

      console.log('[node] Formatted JID:', jid);
      console.log('[node] Attempting to send message...');

      // Send message using Baileys
      await baileysSocket.sendMessage(jid, { text: message });

      console.log('[node] Message sent successfully to', jid);
      rn_bridge.channel.post('message-sent', {
        success: true,
        phoneNumber,
        message,
      });
    } catch (err) {
      console.error('[node] Failed to send message:', err);
      console.error('[node] Error stack:', err.stack);
      rn_bridge.channel.post('message-sent', {
        success: false,
        error: err.message || String(err),
      });
    }
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
  console.log('[node] Data type:', typeof data);
  console.log(
    '[node] Data keys:',
    data && typeof data === 'object' ? Object.keys(data) : 'N/A',
  );

  if (!baileysSocket) {
    console.error('[node] Baileys socket not initialized');
    rn_bridge.channel.post('message-sent', {
      success: false,
      error: 'Socket not initialized',
    });
    return;
  }

  try {
    const { phoneNumber, message } = data;
    console.log('[node] Extracted phoneNumber:', phoneNumber);
    console.log('[node] Extracted message:', message);

    if (!phoneNumber || !message) {
      throw new Error('Missing phoneNumber or message in data');
    }

    // Format phone number (add @s.whatsapp.net if not present)
    const jid = phoneNumber.includes('@')
      ? phoneNumber
      : `${phoneNumber}@s.whatsapp.net`;

    console.log('[node] Formatted JID:', jid);
    console.log('[node] Attempting to send message...');

    // Send message using Baileys
    await baileysSocket.sendMessage(jid, { text: message });

    console.log('[node] Message sent successfully to', jid);
    rn_bridge.channel.post('message-sent', {
      success: true,
      phoneNumber,
      message,
    });
  } catch (err) {
    console.error('[node] Failed to send message:', err);
    console.error('[node] Error stack:', err.stack);
    rn_bridge.channel.post('message-sent', {
      success: false,
      error: err.message || String(err),
    });
  }
});

// Handle app lifecycle events
rn_bridge.app.on('pause', pauseLock => {
  console.log('[node] App paused');
  // You can perform cleanup here
  pauseLock.release();
});

rn_bridge.app.on('resume', () => {
  console.log('[node] App resumed');
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('[node] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[node] HTTP server closed');
    process.exit(0);
  });
});

console.log('[node] Node.js runtime initialized');
