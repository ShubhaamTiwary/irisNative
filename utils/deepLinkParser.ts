/**
 * Parse deep link URL to extract openLink parameter
 * Format: iris://?openLink=https://example.com
 */
export const parseDeepLink = (url: string): string | null => {
  try {
    console.log('[React Native] Parsing deep link:', url);
    if (!url || !url.includes('iris://')) {
      return null;
    }

    // Handle the case where openLink contains query parameters
    // Format: iris://?openLink=https://example.com?param1=value1&param2=value2
    // The openLink value itself may contain & characters, so we need to extract it carefully

    // Remove the scheme part
    const urlWithoutScheme = url.replace('iris://', '');

    // Check if there's a query string
    if (!urlWithoutScheme.startsWith('?')) {
      return null;
    }

    const queryString = urlWithoutScheme.substring(1); // Remove the '?'

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
