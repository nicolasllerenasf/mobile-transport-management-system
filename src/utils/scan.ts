function buildSerieNumero(serie: string, numero: string): string | null {
  const s = serie.trim();
  const n = numero.trim();
  if (!s || !n) return null;
  if (!/^[A-Za-z0-9]{2,}$/.test(s) || !/^\d+$/.test(n)) return null;
  return `${s}-${n.padStart(8, '0')}`;
}

/**
 * Normaliza un identificador escaneado (QR, codigo de barras, manual) a un
 * formato estandar (`SERIE-NUMERO` o el codigo de picking tal cual).
 * Replica web/src/utils/scan.ts para mantener el mismo comportamiento.
 */
export function parseGuiaIdentifier(input: string): string {
  if (!input) return '';
  const raw = input.trim().replace(/\.pdf$/i, '').trim();
  if (!raw) return '';

  if (/^\d{4,6}-\d{1,4}$/.test(raw)) return raw;

  if (raw.includes('|')) {
    const parts = raw.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      const built = buildSerieNumero(parts[2], parts[3]);
      if (built) return built;
    }
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const segs = u.pathname.split('/').map((s) => s.trim()).filter(Boolean);
      if (segs.length >= 2) {
        const built = buildSerieNumero(segs[segs.length - 2], segs[segs.length - 1]);
        if (built) return built;
      }
      const params = ['serieNumero', 'serie_numero', 'guia', 'nro', 'serieNumeroGuia'];
      for (const p of params) {
        const v = u.searchParams.get(p);
        if (v) return v;
      }
    } catch {
      // input no es una URL valida; se ignora
    }
  }

  if (raw.includes('-')) {
    const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      const built = buildSerieNumero(parts[parts.length - 2], parts[parts.length - 1]);
      if (built) return built;
    }
    if (parts.length === 2) {
      const built = buildSerieNumero(parts[0], parts[1]);
      if (built) return built;
    }
  } else if (/^[A-Za-z0-9]{12,13}$/.test(raw)) {
    const m = raw.match(/^([A-Za-z][A-Za-z0-9]{3})(\d+)$/);
    if (m) {
      const built = buildSerieNumero(m[1], m[2]);
      if (built) return built;
    }
  }

  return raw;
}

/**
 * Set de candidatos para hacer match local contra las guias del viaje.
 */
export function guiaMatchCandidates(input: string): string[] {
  const out = new Set<string>();
  if (!input) return [];
  const raw = input.trim();
  if (!raw) return [];
  out.add(raw);

  const parsed = parseGuiaIdentifier(raw);
  if (parsed) out.add(parsed);

  if (parsed.includes('-')) {
    const [s, n] = parsed.split('-');
    if (s && n) {
      out.add(`${s}${n}`);
      out.add(`${s}-${n.replace(/^0+/, '')}`);
    }
  }

  return [...out];
}
