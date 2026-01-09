import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const DeepLinkMessage: React.FC = () => {
  return (
    <View style={styles.messageContainer}>
      <Text style={styles.messageTitle}>⚠️ Deep Link Required</Text>
      <Text style={styles.messageText}>
        Please open this app using a deep link.{'\n\n'}
        The app only works when launched via:{'\n'}
        <Text style={styles.deeplinkExample}>
          iris://?openLink=https://...
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 350,
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  deeplinkExample: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    fontSize: 14,
    color: '#333',
  },
});

