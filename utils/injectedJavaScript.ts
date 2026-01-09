/**
 * Generate injected JavaScript for WebView
 * This exposes the irisElectron API to the website
 */
export const getInjectedJavaScript = (): string => {
  return `
    window.irisElectron = {
      sendMessage: function(data) {
        return new Promise((resolve, reject) => {
          const requestId = Date.now().toString() + Math.random().toString();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'sendMessage',
            data: data,
            requestId: requestId
          }));
          
          // Store the promise handlers globally to be called from injected JS
          if (!window.irisPendingRequests) {
            window.irisPendingRequests = {};
          }
          window.irisPendingRequests[requestId] = { resolve, reject };
        });
      },
      logout: function() {
        return new Promise((resolve, reject) => {
          const requestId = Date.now().toString() + Math.random().toString();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'logout',
            requestId: requestId
          }));
          
          // Store the promise handlers globally to be called from injected JS
          if (!window.irisPendingRequests) {
            window.irisPendingRequests = {};
          }
          window.irisPendingRequests[requestId] = { resolve, reject };
        });
      },
      getPhoneNumber: function() {
        return new Promise((resolve, reject) => {
          const requestId = Date.now().toString() + Math.random().toString();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'getPhoneNumber',
            requestId: requestId
          }));
          
          // Store the promise handlers globally to be called from injected JS
          if (!window.irisPendingRequests) {
            window.irisPendingRequests = {};
          }
          window.irisPendingRequests[requestId] = { resolve, reject };
        });
      }
    };
    true; // Note: The injected script must return a boolean or nothing
  `;
};

