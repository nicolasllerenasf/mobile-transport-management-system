import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CameraView, useCameraPermissions,
  type BarcodeScanningResult, type BarcodeType,
} from 'expo-camera';
import { colors } from '../theme';

interface Props {
  onScan: (data: string) => void;
  paused?: boolean;
}

const BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'code128',
  'code39',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'pdf417',
  'itf14',
];

export default function BarcodeScanner({ onScan, paused }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastRef = useRef<{ data: string; at: number }>({ data: '', at: 0 });

  if (!permission) {
    return <View style={styles.box} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.permText}>Necesitamos acceso a la camara para escanear las guias.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir camara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handle = (result: BarcodeScanningResult) => {
    if (paused) return;
    const data = (result.data || '').trim();
    if (!data) return;
    const now = Date.now();
    // Evita disparos repetidos del mismo codigo en menos de 2.5s.
    if (data === lastRef.current.data && now - lastRef.current.at < 2500) return;
    lastRef.current = { data, at: now };
    onScan(data);
  };

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={paused ? undefined : handle}
      />
      <View style={styles.frame} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '15%',
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 16,
    opacity: 0.9,
  },
  permText: {
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    fontSize: 13,
  },
  permBtn: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: { color: colors.white, fontWeight: '700' },
});
