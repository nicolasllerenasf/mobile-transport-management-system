import { API_URL } from '../config';
import type { Usuario, Viaje, GuiaRemision, StatsTransportista } from '../types';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error de conexion' }));
    throw new Error((error as any).message || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ScanResult {
  nro_guia: string;
  picking_code: string | null;
  destino_nombre: string;
  es_carretera?: boolean;
}

export const api = {
  login: (codigo: string, clave: string) =>
    request<Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ codigo, clave }),
    }),

  getViajes: (id_transportista: number, estado?: string) => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    params.set('id_transportista', String(id_transportista));
    return request<Viaje[]>(`/viajes?${params.toString()}`);
  },

  getViajeDetalles: (id: number) => request<Viaje>(`/viajes/${id}/detalles`),

  empezarViaje: (id: number) =>
    request<Viaje>(`/viajes/${id}/empezar`, { method: 'PATCH' }),

  getStatsTransportista: (id_transportista: number) =>
    request<StatsTransportista>(`/viajes/stats/${id_transportista}`),

  scanGuia: (nroGuia: string) =>
    request<ScanResult>(`/guias/scan/${encodeURIComponent(nroGuia)}`),

  registrarUbicacion: (
    id_viaje: number,
    data: { lat: number; lng: number; velocidad?: number | null; precision_m?: number | null },
  ) =>
    request<{ ok: boolean; id_punto: number }>(`/viajes/${id_viaje}/ubicacion`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  entregarTiendaConFoto: async (
    id_viaje: number,
    id_guias: number[],
    observacion?: string,
    fotoUri?: string,
  ): Promise<{ ok: boolean; entregadas: number }> => {
    const formData = new FormData();
    formData.append('id_guias', JSON.stringify(id_guias));
    if (observacion) formData.append('observacion', observacion);
    if (fotoUri) {
      formData.append('foto', {
        uri: fotoUri,
        name: 'entrega.jpg',
        type: 'image/jpeg',
      } as any);
    }
    const res = await fetch(`${API_URL}/viajes/${id_viaje}/entregar-tienda`, {
      method: 'PATCH',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Error' }));
      throw new Error((error as any).message || `Error ${res.status}`);
    }
    return res.json() as Promise<{ ok: boolean; entregadas: number }>;
  },
};

export type { Usuario, Viaje, GuiaRemision, StatsTransportista };
