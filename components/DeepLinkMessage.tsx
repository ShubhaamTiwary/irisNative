import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';

const NSLogoSvg = `<svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.2529 0.00217176V10.7127C20.2529 13.1833 19.4691 15.4606 18.1499 17.2794C17.3045 18.4462 16.2376 19.4262 15.0168 20.1455C14.8999 20.215 14.7829 20.2802 14.6639 20.3454C13.2954 21.0799 11.7504 21.4971 10.1111 21.5058C10.0947 21.5058 10.0782 21.5058 10.0618 21.5058H9.85459C8.03263 21.5058 6.32762 20.9821 4.86267 20.0694C1.95327 18.255 0 14.9043 0 11.069V10.5062C0 6.66011 1.95122 3.29638 4.86267 1.46675C5.04527 1.35158 5.23198 1.24293 5.42074 1.1408C6.74823 0.423727 8.24602 0.0152107 9.83408 0C9.8628 0 9.89153 0 9.9182 0H20.2529V0.00217176Z" fill="#7E9ACF"/>
<path d="M10.111 0.00217176V21.5058C10.0946 21.5058 10.0782 21.5058 10.0618 21.5058H9.85457C8.03261 21.5058 6.3276 20.9821 4.86264 20.0694V1.46675C5.04525 1.35158 5.23196 1.24293 5.42072 1.1408C6.74821 0.423727 8.24599 0.0152107 9.83405 0C9.86278 0 9.8915 0 9.91818 0H10.111V0.00217176Z" fill="#78C7CE"/>
<path d="M18.1498 17.2816C17.3045 18.4484 16.2375 19.4284 15.0168 20.1477C14.8998 20.2172 14.7829 20.2824 14.6638 20.3476L10.111 10.8865L5.42273 1.143C6.75022 0.425924 8.248 0.017408 9.83606 0.00219727L10.111 0.571514L15.0168 10.767L18.1498 17.2816Z" fill="#84CEBF"/>
<path d="M20.2534 0.00217176V10.7127C20.2534 13.1833 19.4696 15.4606 18.1503 17.2794C17.305 18.4462 16.2381 19.4262 15.0173 20.1455V0H20.2534V0.00217176Z" fill="#78C7CE"/>
</svg>`;

export const DeepLinkMessage: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoGradient}>
            <SvgXml xml={NSLogoSvg} width={48} height={50} />
          </View>
        </View>
      </View>

      {/* App Name and Tagline */}
      <Text style={styles.appName}>Iris</Text>
      <Text style={styles.tagline}>Your WhatsApp helper</Text>

      {/* Card */}
      <View style={styles.card}>
        {/* Phone Icon */}
        <View style={styles.iconContainer}>
          <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <Path
              d="M17 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V4C19 2.89543 18.1046 2 17 2Z"
              stroke="#9CA3AF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 18H12.01"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        {/* Heading */}
        <Text style={styles.cardTitle}>Launch from LSQ</Text>

        {/* Instructions */}
        <Text style={styles.cardText}>
          Please launch the application from your LSQ dashboard to continue.
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Powered by Newton School</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
