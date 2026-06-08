export type RootStackParamList = {
  Login: undefined;
  Viajes: undefined;
  ViajeDetalle: { id: number };
  Entrega: { idViaje: number; guiaId: number };
};
