/**
 * Parse deep link URL to extract openLink parameter
 * Formats:
 * - iris://?openLink=https://example.com (custom scheme)
 * - https://iris.app/?openLink=https://example.com (HTTP/HTTPS for ChromeOS)
 * - http://iris.app/?openLink=https://example.com (HTTP/HTTPS for ChromeOS)
 */
export const parseDeepLink = (url: string): string | null => {
  try {
    console.log('[React Native] Parsing deep link:', url);
    if (!url) {
      return null;
    }

    let queryString = '';

    // Handle custom scheme: iris://?openLink=...
    if (url.includes('iris://')) {
      // Remove the scheme part
      const urlWithoutScheme = url.replace('iris://', '');

      // Check if there's a query string
      if (!urlWithoutScheme.startsWith('?')) {
        return null;
      }

      queryString = urlWithoutScheme.substring(1); // Remove the '?'
    }
    // Handle HTTP/HTTPS scheme: https://iris.app/?openLink=... or http://iris.app/?openLink=...
    else if (url.includes('://iris.app/') || url.includes('://iris.app?')) {
      try {
        const urlObj = new URL(url);
        // Extract query string from URL object
        const search = (urlObj as any).search || '';
        queryString = search.startsWith('?') ? search.substring(1) : search;
      } catch (error) {
        console.error('[React Native] Error parsing HTTP/HTTPS URL:', error);
        // Fallback: manually extract query string
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          queryString = url.substring(queryIndex + 1);
        } else {
          return null;
        }
      }
    } else {
      return null;
    }

    if (!queryString) {
      return null;
    }

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
