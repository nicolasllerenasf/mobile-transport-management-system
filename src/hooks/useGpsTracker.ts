import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { GPS_POST_INTERVAL_MS } from '../config';

export type GpsStatus = 'idle' | 'sin_permiso' | 'activo' | 'error';

/**
 * Mientras `activo` sea true, pide permiso de ubicacion en primer plano y reporta
 * la posicion del conductor al backend (POST /viajes/:id/ubicacion) cada
 * GPS_POST_INTERVAL_MS. Pensado para correr en la pantalla del viaje en curso.
 *
 * El emisor en segundo plano (con foreground service) es una mejora posterior:
 * requiere expo-task-manager y Location.startLocationUpdatesAsync.
 */
export function useGpsTracker(idViaje: number | null, activo: boolean) {
  const [status, setStatus] = useState<GpsStatus>('idle');
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    let cancelado = false;

    const detener = () => {
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
    };

    const iniciar = async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (cancelado) return;
      if (perm !== 'granted') {
        setStatus('sin_permiso');
        return;
      }
      try {
        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: GPS_POST_INTERVAL_MS,
            distanceInterval: 25,
          },
          (loc) => {
            const ahora = Date.now();
            if (ahora - lastSentRef.current < GPS_POST_INTERVAL_MS - 1000) return;
            lastSentRef.current = ahora;
            if (idViaje == null) return;
            api
              .registrarUbicacion(idViaje, {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                velocidad: loc.coords.speed ?? null,
                precision_m: loc.coords.accuracy ?? null,
              })
              .catch(() => {
                /* reintenta en la siguiente lectura */
              });
          },
        );
        if (!cancelado) setStatus('activo');
      } catch {
        if (!cancelado) setStatus('error');
      }
    };

    if (activo && idViaje != null) {
      iniciar();
    } else {
      detener();
      setStatus('idle');
    }

    return () => {
      cancelado = true;
      detener();
    };
  }, [idViaje, activo]);

  return status;
}
