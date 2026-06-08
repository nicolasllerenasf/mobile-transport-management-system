import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!codigo.trim() || !clave.trim()) {
      setError('Ingresa tu codigo y contrasena');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(codigo.trim(), clave);
      // La navegacion se actualiza sola al setear el usuario en el contexto.
    } catch (err: any) {
      setError(err?.message || 'Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.brandTop}>
        <Text style={styles.brandText}>FOOTLOOSE</Text>
        <Text style={styles.brandSub}>Despacho</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.card}
      >
        <Text style={styles.title}>Bienvenido!</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          placeholder="Codigo"
          placeholderTextColor={colors.gray400}
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          placeholder="Contrasena"
          placeholderTextColor={colors.gray400}
          value={clave}
          onChangeText={setClave}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesion</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Si eres conductor de una empresa tercera, solicita tu usuario y clave al administrador de Footloose.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brandPurple },
  brandTop: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  brandText: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  brandSub: { color: colors.white, fontSize: 16, fontWeight: '300', letterSpacing: 3, marginTop: 2 },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.brandInk, textAlign: 'center', marginBottom: 32 },
  errorBox: {
    backgroundColor: colors.brandRedSoft,
    borderColor: '#F5B5B2',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  errorText: { color: colors.brandRed, textAlign: 'center', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.brandInk,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.brandPurple,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  hint: { color: colors.gray400, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
