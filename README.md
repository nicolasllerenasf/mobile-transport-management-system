# FOOTLOOSE Despacho — App del conductor (mobile)

App móvil en **React Native (Expo + TypeScript)** para el transportista. Consume el
mismo backend NestJS que la web (`/transport-management-system/api`). Es un proyecto
**independiente** de `web/`: se desarrolla, versiona y despliega por separado.

## Qué hace

- Login del conductor (mismo `CODIGO` + `CLAVE` que la web).
- Lista de viajes asignados (nuevos / en curso) y perfil con stats.
- Detalle del viaje con destinos agrupados por tienda (realizados / pendientes).
- **Emisor GPS**: mientras un viaje está `EN_RUTA` y su pantalla de detalle está
  abierta, reporta la posición al backend (`POST /viajes/:id/ubicacion`) cada 15 s.
  Es lo que alimenta el mapa en vivo del panel admin (web).
- Entrega por tienda: escaneo de la guía (QR / código de barras) → foto de
  evidencia → observación → `PATCH /viajes/:id/entregar-tienda` (una foto por tienda).

## Stack

- Expo SDK 52 · React Native 0.76 · React 18
- `@react-navigation/native` (native-stack)
- `expo-location` (GPS), `expo-camera` (escaneo), `expo-image-picker` (foto)
- `@react-native-async-storage/async-storage` (sesión persistida)

## Configuración del backend

La URL del API se define en `app.json` → `expo.extra.apiUrl`:

| Ambiente | URL |
|---|---|
| Test | `https://apistest.footloose.pe/transport-management-system/api` |
| Producción | `https://apis.footloose.pe/transport-management-system/api` |

Por defecto apunta a **Test**. Cámbialo antes de generar el APK de producción.

## Desarrollo

```bash
cd mobile
npm install
# si Expo reporta versiones desalineadas:
npx expo install --fix

npm start          # abre Expo (Metro). Escanea el QR con Expo Go en el celular
```

> El escaneo de códigos de barras y el GPS requieren un dispositivo real (no funcionan
> en el navegador). Usa **Expo Go** o un *development build*.

## Generar el APK (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview   # genera un .apk instalable
```

## Pendiente / siguiente iteración

- **GPS en segundo plano** (cuando la app está minimizada): requiere
  `expo-task-manager` + `Location.startLocationUpdatesAsync` con *foreground service*
  en Android. Hoy el emisor corre en primer plano (pantalla del viaje abierta).
