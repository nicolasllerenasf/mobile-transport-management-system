import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/**
 * URL base del backend. Se configura en app.json -> expo.extra.apiUrl.
 * Test: https://apistest.footloose.pe/transport-management-system/api
 * Prod: https://apis.footloose.pe/transport-management-system/api
 */
export const API_URL = (
  extra.apiUrl || 'https://apistest.footloose.pe/transport-management-system/api'
).replace(/\/+$/, '');

/** Cada cuanto (ms) se reporta la posicion del conductor al backend. */
export const GPS_POST_INTERVAL_MS = 15000;
