import type { GuiaRemision } from '../types';

export function getTiendaKey(g: GuiaRemision): string {
  const fox = g.tienda_fox_nombre;
  const nombre = g.destino_nombre || '';
  return fox && fox.trim() ? `FOX:${fox.trim().toUpperCase()}` : `NOM:${nombre.trim().toUpperCase()}`;
}

export interface TiendaGrupo {
  key: string;
  destino_nombre: string;
  destino_direccion: string | null;
  guias: GuiaRemision[];
  entregadas: number;
  pendientes: number;
  es_lima: boolean;
  fecha_entrega: Date | null;
  total_unidades: number;
}

export function agruparPorTienda(guias: GuiaRemision[]): TiendaGrupo[] {
  const map = new Map<string, TiendaGrupo>();
  for (const g of guias) {
    const key = getTiendaKey(g);
    let grupo = map.get(key);
    if (!grupo) {
      grupo = {
        key,
        destino_nombre: g.destino_nombre,
        destino_direccion: g.destino_direccion || null,
        guias: [],
        entregadas: 0,
        pendientes: 0,
        es_lima: !!g.es_lima,
        fecha_entrega: null,
        total_unidades: 0,
      };
      map.set(key, grupo);
    }
    grupo.guias.push(g);
    grupo.total_unidades += g.cantidad_cajas || 0;
    if (g.estado_entrega === 'ENTREGADO') {
      grupo.entregadas += 1;
      const fe = g.fecha_entrega ? new Date(g.fecha_entrega) : null;
      if (fe && (!grupo.fecha_entrega || fe > grupo.fecha_entrega)) grupo.fecha_entrega = fe;
    } else {
      grupo.pendientes += 1;
    }
  }
  return [...map.values()];
}
