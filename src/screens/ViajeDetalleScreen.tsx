import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect, useNavigation, useRoute,
  type NavigationProp, type RouteProp,
} from '@react-navigation/native';
import { api } from '../services/api';
import { colors } from '../theme';
import { agruparPorTienda } from '../utils/tienda';
import { useGpsTracker } from '../hooks/useGpsTracker';
import type { Viaje } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = NavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'ViajeDetalle'>;

function formatTime(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
}

export default function ViajeDetalleScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { id } = route.params;
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const v = await api.getViajeDetalles(id);
      setViaje(v);
    } catch {
      // mantiene el estado anterior
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const enRuta = viaje?.estado_viaje === 'EN_RUTA';
  const gps = useGpsTracker(id, !!enRuta);

  const grupos = useMemo(() => agruparPorTienda(viaje?.guias || []), [viaje]);
  const realizados = grupos.filter((g) => g.pendientes === 0);
  const pendientes = grupos.filter((g) => g.pendientes > 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPurple} />
      </View>
    );
  }

  if (!viaje) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Viaje no encontrado</Text>
      </View>
    );
  }

  const isFinished = viaje.estado_viaje === 'FINALIZADO';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isFinished ? 'Detalles del viaje' : 'Viaje en curso'}</Text>
      </View>

      {enRuta && (
        <View style={styles.gpsBar}>
          <View style={[styles.dot, gps === 'activo' ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.gpsText}>
            {gps === 'activo'
              ? 'Compartiendo ubicacion con la central'
              : gps === 'sin_permiso'
                ? 'Activa el permiso de ubicacion para el seguimiento'
                : gps === 'error'
                  ? 'No se pudo iniciar el GPS'
                  : 'Iniciando GPS...'}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {realizados.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Destinos realizados:</Text>
            {realizados.map((g, idx) => (
              <View key={g.key} style={[styles.destCard, styles.destDone]}>
                <Text style={styles.destIndex}>Destino {idx + 1}</Text>
                <Text style={styles.destName}>{g.destino_nombre}</Text>
                <Text style={styles.destMeta}>
                  {g.guias.length} guia{g.guias.length > 1 ? 's' : ''} · {g.total_unidades} unidades
                </Text>
                {g.fecha_entrega && (
                  <Text style={styles.destTime}>Entregado a las {formatTime(g.fecha_entrega)}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {pendientes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Destinos pendientes:</Text>
            {pendientes.map((g, idx) => {
              const guiaParaEntrega = g.guias.find((x) => x.estado_entrega !== 'ENTREGADO');
              return (
                <View key={g.key} style={styles.destCard}>
                  <Text style={styles.destIndex}>Destino {realizados.length + idx + 1}</Text>
                  <Text style={styles.destName}>{g.destino_nombre}</Text>
                  {g.destino_direccion ? <Text style={styles.destAddr}>{g.destino_direccion}</Text> : null}
                  <Text style={styles.destMeta}>
                    {g.guias.length} guia{g.guias.length > 1 ? 's' : ''} · {g.total_unidades} unidades
                  </Text>
                  {guiaParaEntrega && !isFinished && (
                    <TouchableOpacity
                      style={styles.entregaBtn}
                      onPress={() =>
                        navigation.navigate('Entrega', { idViaje: id, guiaId: guiaParaEntrega.id_guia })
                      }
                    >
                      <Text style={styles.entregaBtnText}>Realizar entrega</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        {pendientes.length === 0 && (
          <TouchableOpacity style={styles.volverBtn} onPress={() => navigation.navigate('Viajes')}>
            <Text style={styles.volverText}>Volver a mis viajes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  muted: { color: colors.gray500 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.brandPurple, paddingHorizontal: 16, paddingVertical: 14,
  },
  back: { width: 32 },
  backText: { color: colors.white, fontSize: 30, lineHeight: 30, fontWeight: '300' },
  headerTitle: { color: colors.white, fontWeight: '700', fontSize: 18 },
  gpsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.brandPurpleSoft, paddingHorizontal: 20, paddingVertical: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.green },
  dotOff: { backgroundColor: colors.orange },
  gpsText: { color: colors.brandPurple, fontSize: 12, fontWeight: '600', flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 16, marginBottom: 12, marginTop: 4 },
  destCard: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.gray200,
    borderRadius: 18, padding: 16, marginBottom: 12,
  },
  destDone: { borderWidth: 2, borderColor: colors.green },
  destIndex: { color: colors.gray500, fontSize: 12 },
  destName: { color: colors.brandInk, fontWeight: '700', fontSize: 15, marginTop: 2 },
  destAddr: { color: colors.gray500, fontSize: 12, marginTop: 2 },
  destMeta: { color: colors.gray500, fontSize: 12, marginTop: 6 },
  destTime: { color: colors.gray500, fontSize: 12, marginTop: 4 },
  entregaBtn: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', marginTop: 12,
  },
  entregaBtnText: { color: colors.brandInk, fontWeight: '700', fontSize: 14 },
  volverBtn: {
    backgroundColor: colors.brandRed, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 10,
  },
  volverText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
