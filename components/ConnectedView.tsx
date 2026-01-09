import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface ConnectedViewProps {
  isSending: boolean;
  onSendMessage: () => void;
}

export const ConnectedView: React.FC<ConnectedViewProps> = ({
  isSending,
  onSendMessage,
}) => {
  return (
    <View style={styles.connectedContainer}>
      <Text style={styles.connectedTitle}>✅ Connected to WhatsApp</Text>
      <TouchableOpacity
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        onPress={onSendMessage}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.sendButtonText}>
            Send Message to 917389893567
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  connectedContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 300,
  },
  connectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#25D366',
  },
  sendButton: {
    backgroundColor: '#25D366',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

