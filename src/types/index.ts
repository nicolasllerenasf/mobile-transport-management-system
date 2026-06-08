export interface Usuario {
  id_usuario: number;
  codigo: string;
  nombre: string;
  rol: string;
  documento?: string;
  tipo?: string;
  ruc_empresa?: string;
  razon_social_empresa?: string;
}

export interface GuiaRemision {
  id_guia: number;
  nro_guia: string;
  destino_nombre: string;
  destino_direccion: string;
  cantidad_cajas: number;
  cantidad_skus: number;
  estado_entrega: string;
  fecha_entrega: string | null;
  observacion?: string;
  ubigeo_destino?: string | null;
  es_lima?: boolean;
  picking_code?: string | null;
  tienda_fox_nombre?: string | null;
  boleta_url?: string | null;
}

export interface Viaje {
  id_viaje: number;
  tipo_transporte: string;
  estado_viaje: string;
  fecha_creacion: string;
  id_transportista?: number;
  placa_vehiculo?: string;
  nombre_conductor?: string;
  doc_conductor?: string;
  razon_social_tercero?: string;
  ruc_tercero?: string;
  guias?: GuiaRemision[];
}

export interface StatsTransportista {
  viajes_pendientes: number;
  viajes_completados: number;
  incidencias_registradas: number;
  total_guias: number;
  guias_entregadas: number;
  tasa_entrega: number;
  ultimo_viaje_fecha: string | null;
  miembro_desde: string | null;
}
