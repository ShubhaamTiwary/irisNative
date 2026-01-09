import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  qrCode: string;
  pendingUrl?: string | null;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCode,
  pendingUrl,
}) => {
  return (
    <View style={styles.qrContainer}>
      <Text style={styles.title}>Scan QR Code to Connect</Text>
      <View style={styles.qrWrapper}>
        <QRCode
          value={qrCode}
          size={250}
          backgroundColor="white"
          color="black"
        />
      </View>
      <Text style={styles.instruction}>
        Open WhatsApp and scan this QR code
      </Text>
      {pendingUrl && (
        <Text style={styles.pendingUrlText}>
          Waiting for login to open link...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  pendingUrlText: {
    marginTop: 15,
    fontSize: 14,
    color: '#25D366',
    fontStyle: 'italic',
  },
});
