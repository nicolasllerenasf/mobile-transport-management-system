import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import type { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import ViajesScreen from './src/screens/ViajesScreen';
import ViajeDetalleScreen from './src/screens/ViajeDetalleScreen';
import EntregaScreen from './src/screens/EntregaScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Routes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.brandPurple} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Viajes" component={ViajesScreen} />
          <Stack.Screen name="ViajeDetalle" component={ViajeDetalleScreen} />
          <Stack.Screen name="Entrega" component={EntregaScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
