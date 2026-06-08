import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { Viaje, StatsTransportista } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = NavigationProp<RootStackParamList>;
type Tab = 'viajes' | 'perfil';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  const dias = Math.round(hrs / 24);
  return `hace ${dias} dia${dias > 1 ? 's' : ''}`;
}

export default function ViajesScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('viajes');
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [stats, setStats] = useState<StatsTransportista | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!user?.id_usuario) return;
    try {
      const [vs, st] = await Promise.all([
        api.getViajes(user.id_usuario),
        api.getStatsTransportista(user.id_usuario).catch(() => null),
      ]);
      setViajes(vs);
      setStats(st);
    } catch {
      setViajes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id_usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargar();
  };

  const nuevos = viajes.filter((v) => v.estado_viaje === 'CREADO');
  const enCurso = viajes.filter((v) => v.estado_viaje === 'EN_RUTA');

  const handleEmpezar = async (id: number) => {
    setStarting(id);
    try {
      await api.empezarViaje(id);
      navigation.navigate('ViajeDetalle', { id });
    } catch {
      // se mantiene en la lista
    } finally {
      setStarting(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FOOTLOOSE Despacho</Text>
      </View>

      <View style={styles.tabs}>
        {(['viajes', 'perfil'] as const).map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'viajes' ? 'Viajes' : 'Perfil'}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'viajes' ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brandPurple} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {viajes.length === 0 && (
              <Text style={styles.empty}>No tienes viajes asignados</Text>
            )}

            {nuevos.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Nuevos viajes:</Text>
                {nuevos.map((v) => (
                  <ViajeCard
                    key={v.id_viaje}
                    viaje={v}
                    nuevo
                    actionLabel="Empezar viaje"
                    loadingAction={starting === v.id_viaje}
                    onAction={() => handleEmpezar(v.id_viaje)}
                  />
                ))}
              </>
            )}

            {enCurso.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Viajes en curso:</Text>
                {enCurso.map((v) => (
                  <ViajeCard
                    key={v.id_viaje}
                    viaje={v}
                    actionLabel="Continuar viaje"
                    onAction={() => navigation.navigate('ViajeDetalle', { id: v.id_viaje })}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )
      ) : (
        <Perfil user={user} stats={stats} onLogout={logout} />
      )}
    </SafeAreaView>
  );
}

function ViajeCard({
  viaje, nuevo, actionLabel, loadingAction, onAction,
}: {
  viaje: Viaje;
  nuevo?: boolean;
  actionLabel: string;
  loadingAction?: boolean;
  onAction: () => void;
}) {
  const guias = viaje.guias || [];
  const titulo = viaje.placa_vehiculo || viaje.razon_social_tercero || `Viaje #${viaje.id_viaje}`;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.badge, nuevo ? styles.badgeSoft : styles.badgePurple]}>
          <Text style={[styles.badgeText, nuevo ? styles.badgeTextSoft : styles.badgeTextWhite]}>
            {nuevo ? 'Viaje nuevo' : 'En ruta'}
          </Text>
        </View>
        <Text style={styles.cardTime}>{timeAgo(viaje.fecha_creacion)}</Text>
      </View>
      <Text style={styles.cardTitle}>{titulo}</Text>
      <Text style={styles.cardLine}>Total de guias: {guias.length}</Text>
      <Text style={styles.cardLabel}>Destinos:</Text>
      {guias.slice(0, 6).map((g) => (
        <Text key={g.id_guia} style={styles.cardDest}>
          {'•'} {g.destino_nombre}
          {g.estado_entrega === 'ENTREGADO' ? '  ✓' : ''}
        </Text>
      ))}
      {guias.length > 6 && <Text style={styles.cardDest}>{`+${guias.length - 6} mas...`}</Text>}
      <TouchableOpacity style={styles.cardBtn} onPress={onAction} disabled={loadingAction}>
        {loadingAction ? (
          <ActivityIndicator color={colors.brandInk} />
        ) : (
          <Text style={styles.cardBtnText}>{actionLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function Perfil({
  user, stats, onLogout,
}: {
  user: ReturnType<typeof useAuth>['user'];
  stats: StatsTransportista | null;
  onLogout: () => void;
}) {
  const isTercero = user?.tipo === 'TERCERO';
  const tasa = stats?.tasa_entrega ?? 0;
  const nombre = user?.nombre || 'Transportista';
  const initials = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{nombre}</Text>
        <View style={[styles.badge, styles.badgeSoft, { alignSelf: 'center', marginTop: 8 }]}>
          <Text style={[styles.badgeText, styles.badgeTextSoft]}>
            {isTercero ? 'Tercero' : 'Transporte propio'}
          </Text>
        </View>
        {isTercero && user?.razon_social_empresa ? (
          <Text style={styles.profileEmpresa}>{user.razon_social_empresa}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Rendimiento</Text>
          <Text style={styles.perfPct}>{tasa}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${tasa}%` }]} />
        </View>
        <Text style={styles.perfSub}>
          {stats?.guias_entregadas ?? 0} de {stats?.total_guias ?? 0} guias entregadas
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="Pendientes" value={stats?.viajes_pendientes ?? 0} />
        <StatTile label="Completados" value={stats?.viajes_completados ?? 0} />
        <StatTile label="Guias entregadas" value={stats?.guias_entregadas ?? 0} />
        <StatTile label="Incidencias" value={stats?.incidencias_registradas ?? 0} />
      </View>

      <View style={styles.card}>
        <Text style={styles.infoTitle}>Informacion personal</Text>
        <InfoRow label="Codigo" value={user?.codigo || '—'} />
        {user?.documento ? <InfoRow label="DNI" value={user.documento} /> : null}
        {isTercero && user?.ruc_empresa ? <InfoRow label="RUC empresa" value={user.ruc_empresa} /> : null}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.brandPurple, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: colors.white, fontWeight: '700', fontSize: 16 },
  tabs: { flexDirection: 'row', backgroundColor: colors.brandPurple, paddingHorizontal: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: colors.gray400, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: colors.white },
  tabUnderline: { position: 'absolute', bottom: 0, width: 56, height: 3, borderRadius: 2, backgroundColor: colors.brandRed },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  empty: { color: colors.gray500, textAlign: 'center', marginTop: 40 },
  sectionTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 16, marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgePurple: { backgroundColor: colors.brandPurple },
  badgeSoft: { backgroundColor: colors.brandPurpleSoft },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextWhite: { color: colors.white },
  badgeTextSoft: { color: colors.brandPurple },
  cardTime: { color: colors.gray400, fontSize: 11 },
  cardTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  cardLine: { color: colors.brandInk, fontSize: 14, marginBottom: 4 },
  cardLabel: { color: colors.brandInk, fontSize: 14, marginBottom: 2 },
  cardDest: { color: colors.brandInk, fontSize: 14, marginBottom: 2 },
  cardBtn: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  cardBtnText: { color: colors.brandInk, fontWeight: '700', fontSize: 14 },
  profileCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: colors.brandPurple,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 24 },
  profileName: { color: colors.brandInk, fontWeight: '700', fontSize: 18, textAlign: 'center' },
  profileEmpresa: { color: colors.gray500, fontSize: 12, marginTop: 6 },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  perfLabel: { color: colors.brandInk, fontWeight: '700', fontSize: 14 },
  perfPct: { color: colors.brandPurple, fontWeight: '900', fontSize: 20 },
  barTrack: { height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 8, backgroundColor: colors.brandPurple, borderRadius: 999 },
  perfSub: { color: colors.gray500, fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 0 },
  statTile: {
    width: '48%',
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  statLabel: { color: colors.gray500, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  statValue: { color: colors.brandInk, fontWeight: '900', fontSize: 24 },
  infoTitle: { color: colors.brandInk, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  infoRowLabel: { color: colors.gray500, fontSize: 12 },
  infoRowValue: { color: colors.brandInk, fontWeight: '700', fontSize: 12 },
  logoutBtn: {
    backgroundColor: colors.brandRed,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  logoutText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
