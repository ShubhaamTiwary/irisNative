const http = require('http');
const rn_bridge = require('rn-bridge');

// Log that the Node.js runtime is starting
console.log('[node] Node.js runtime is starting...');

// Create a simple HTTP server
const PORT = 3000;
const server = http.createServer((req, res) => {
  console.log(`[node] Received ${req.method} request to ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Simple routing
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Hello from Node.js Mobile!',
      timestamp: new Date().toISOString()
    }));
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

// Handle messages from React Native
rn_bridge.channel.on('message', (msg) => {
  console.log('[node] Received message from React Native:', msg);
  
  // Echo the message back
  rn_bridge.channel.post('message', { 
    echo: msg,
    timestamp: new Date().toISOString()
  });
});

// Handle app lifecycle events
rn_bridge.app.on('pause', (pauseLock) => {
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

