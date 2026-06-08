import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect, useNavigation, useRoute,
  type NavigationProp, type RouteProp,
} from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { colors } from '../theme';
import { guiaMatchCandidates } from '../utils/scan';
import { getTiendaKey } from '../utils/tienda';
import BarcodeScanner from '../components/BarcodeScanner';
import type { Viaje, GuiaRemision } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = NavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Entrega'>;
type Step = 'scan' | 'photo' | 'confirm';
type ScanStatus = 'scanning' | 'success' | 'already_scanned' | 'wrong_trip' | 'not_found';

export default function EntregaScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { idViaje, guiaId } = route.params;

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [tiendaKey, setTiendaKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('scan');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [observacion, setObservacion] = useState('');
  const [delivering, setDelivering] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const v = await api.getViajeDetalles(idViaje);
      setViaje(v);
      const g = v.guias?.find((x) => x.id_guia === guiaId);
      if (g) setTiendaKey(getTiendaKey(g));
    } catch {
      // se ignora
    } finally {
      setLoading(false);
    }
  }, [idViaje, guiaId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const guiasTiendaPendientes = useMemo<GuiaRemision[]>(() => {
    if (!viaje?.guias || !tiendaKey) return [];
    return viaje.guias.filter((g) => getTiendaKey(g) === tiendaKey && g.estado_entrega !== 'ENTREGADO');
  }, [viaje, tiendaKey]);

  const matchGuiaInViaje = useCallback(
    (...raws: (string | null | undefined)[]): GuiaRemision | null => {
      if (!viaje?.guias?.length) return null;
      const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
      const candidates = new Set<string>();
      for (const raw of raws) {
        if (!raw) continue;
        for (const c of guiaMatchCandidates(raw)) {
          const n = norm(c);
          if (n) candidates.add(n);
        }
      }
      if (!candidates.size) return null;
      return (
        viaje.guias.find((g) => {
          const guiaCands = [norm(g.nro_guia), norm(g.picking_code)].filter(Boolean);
          for (const c of candidates) if (guiaCands.includes(c)) return true;
          return false;
        }) || null
      );
    },
    [viaje],
  );

  const handleScan = async (data: string) => {
    if (scanStatus === 'success' || delivering) return;
    if (!viaje?.guias) {
      setScanStatus('not_found');
      return;
    }

    let matched = matchGuiaInViaje(data);

    if (!matched) {
      try {
        const resolved = await api.scanGuia(data.trim());
        if (resolved?.nro_guia || resolved?.picking_code) {
          matched = matchGuiaInViaje(resolved.nro_guia, resolved.picking_code);
        }
      } catch {
        // se ignora
      }
    }

    if (!matched) {
      setScanStatus('wrong_trip');
      setTimeout(() => setScanStatus('scanning'), 3000);
      return;
    }
    if (matched.estado_entrega === 'ENTREGADO') {
      setScanStatus('already_scanned');
      setTimeout(() => setScanStatus('scanning'), 3000);
      return;
    }
    const matchedKey = getTiendaKey(matched);
    if (tiendaKey && matchedKey !== tiendaKey) {
      setScanStatus('wrong_trip');
      setTimeout(() => setScanStatus('scanning'), 3000);
      return;
    }

    setScanStatus('success');
    setTiendaKey(matchedKey);
    setTimeout(() => setStep('photo'), 700);
  };

  const tomarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos la camara para la foto de evidencia.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    if (!guiasTiendaPendientes.length) return;
    setDelivering(true);
    try {
      const ids = guiasTiendaPendientes.map((g) => g.id_guia);
      await api.entregarTiendaConFoto(idViaje, ids, observacion || undefined, fotoUri || undefined);
      navigation.navigate('ViajeDetalle', { id: idViaje });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo registrar la entrega');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPurple} />
      </View>
    );
  }

  const tiendaNombre = guiasTiendaPendientes[0]?.destino_nombre || '';
  const banner = (() => {
    switch (scanStatus) {
      case 'success': return { bg: colors.green, text: 'Guia escaneada' };
      case 'already_scanned': return { bg: colors.orange, text: 'Esta guia ya fue escaneada' };
      case 'wrong_trip': return { bg: colors.orange, text: 'Esta guia no pertenece a este despacho' };
      case 'not_found': return { bg: colors.brandRed, text: 'Codigo no valido' };
      default: return null;
    }
  })();

  const dark = step === 'scan';

  return (
    <SafeAreaView style={[styles.safe, dark && styles.safeDark]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={[styles.backText, dark && styles.textWhite]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dark && styles.textWhite]}>
          {step === 'scan' ? 'Escanear guia' : step === 'photo' ? 'Realizar entrega' : 'Confirmar entrega'}
        </Text>
      </View>

      {step === 'scan' && (
        <View style={styles.scanWrap}>
          {banner && (
            <View style={[styles.banner, { backgroundColor: banner.bg }]}>
              <Text style={styles.bannerText}>{banner.text}</Text>
            </View>
          )}
          <BarcodeScanner onScan={handleScan} paused={scanStatus === 'success'} />
          <Text style={styles.scanHint}>Apunta la camara al QR o codigo de barras de la guia.</Text>
        </View>
      )}

      {step === 'photo' && (
        <ScrollView contentContainerStyle={styles.body}>
          {guiasTiendaPendientes.length > 1 && (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                <Text style={{ fontWeight: '700' }}>{tiendaNombre}</Text> tiene {guiasTiendaPendientes.length} guias pendientes. Una sola foto cubre todas.
              </Text>
            </View>
          )}

          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.preview} />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>Sin foto</Text>
            </View>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={tomarFoto}>
            <Text style={styles.secondaryBtnText}>{fotoUri ? 'Tomar otra foto' : 'Tomar foto de evidencia'}</Text>
          </TouchableOpacity>

          {fotoUri ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('confirm')}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>La foto de evidencia es obligatoria para confirmar la entrega.</Text>
          )}
        </ScrollView>
      )}

      {step === 'confirm' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{tiendaNombre}</Text>
            <Text style={styles.summarySub}>
              {guiasTiendaPendientes.length} guia{guiasTiendaPendientes.length > 1 ? 's' : ''} ·{' '}
              {guiasTiendaPendientes.reduce((s, g) => s + (g.cantidad_cajas || 0), 0)} unidades en total
            </Text>
            {guiasTiendaPendientes.map((g) => (
              <View key={g.id_guia} style={styles.summaryRow}>
                <Text style={styles.summaryGuia}>{g.nro_guia}</Text>
                <Text style={styles.summaryQty}>{g.cantidad_cajas || 0} u</Text>
              </View>
            ))}
          </View>

          <Text style={styles.label}>Observacion (opcional):</Text>
          <TextInput
            placeholder="Escribe una observacion..."
            placeholderTextColor={colors.gray400}
            value={observacion}
            onChangeText={setObservacion}
            multiline
            style={styles.textarea}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, delivering && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={delivering}
          >
            {delivering ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Confirmar entrega</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  safeDark: { backgroundColor: colors.brandInk },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 32 },
  backText: { color: colors.brandInk, fontSize: 30, lineHeight: 30, fontWeight: '300' },
  textWhite: { color: colors.white },
  headerTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 18, marginLeft: 4 },
  scanWrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  banner: { borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  bannerText: { color: colors.white, fontWeight: '700', textAlign: 'center', fontSize: 14 },
  scanHint: { color: colors.gray400, textAlign: 'center', fontSize: 12, marginTop: 16 },
  body: { padding: 20, paddingBottom: 40 },
  noteBox: {
    backgroundColor: colors.brandPurpleSoft,
    borderWidth: 1, borderColor: colors.brandPurple,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  noteText: { color: colors.brandPurple, fontSize: 12, lineHeight: 18 },
  preview: { width: '100%', height: 280, borderRadius: 16, marginBottom: 14, backgroundColor: colors.gray100 },
  previewEmpty: {
    width: '100%', height: 200, borderRadius: 16, marginBottom: 14,
    backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed',
  },
  previewEmptyText: { color: colors.gray400 },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.brandPurple, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 12,
  },
  secondaryBtnText: { color: colors.brandPurple, fontWeight: '700', fontSize: 14 },
  primaryBtn: {
    backgroundColor: colors.brandPurple, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  hint: { color: colors.gray500, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  summaryCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200,
    borderRadius: 14, padding: 16, marginBottom: 16,
  },
  summaryTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 14 },
  summarySub: { color: colors.gray500, fontSize: 12, marginTop: 4, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryGuia: { color: colors.brandInk, fontSize: 12, fontFamily: 'monospace' },
  summaryQty: { color: colors.gray500, fontWeight: '700', fontSize: 12 },
  label: { color: colors.brandInk, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  textarea: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, height: 120,
    textAlignVertical: 'top', color: colors.brandInk, fontSize: 14, marginBottom: 16,
  },
});
