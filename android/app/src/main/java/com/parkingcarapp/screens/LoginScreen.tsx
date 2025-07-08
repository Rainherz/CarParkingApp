import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { ThemedText } from "../components/common/ThemedText";
import { authService } from "../services/authService";

interface LoginScreenProps {
  onLoginSuccess: (user: { username: string; name: string; role: string }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('🔄 Iniciando login para:', username);
    setLoading(true);
    
    try {
      const user = await authService.login(username, password);
      console.log("👤 Usuario autenticado:", user);
      
      if (user) {
        console.log('✅ Login exitoso, llamando onLoginSuccess', user);
        onLoginSuccess(user);
        Alert.alert("Éxito", `Bienvenido ${user.name}`);
      } else {
        console.log('❌ Login falló - credenciales incorrectas');
        Alert.alert("Error", "Usuario o contraseña incorrectos");
      }
    } catch (error) {
      console.error('💥 Error durante login:', error);
      Alert.alert("Error", "Ocurrió un error durante el login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>Iniciar Sesión</ThemedText>
      <ThemedText style={styles.hint}>
        Usuarios de prueba:{'\n'}
        admin / admin123{'\n'}
        operador / operador123
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button 
        title={loading ? "Ingresando..." : "Ingresar"} 
        onPress={handleLogin} 
        disabled={loading || !username || !password} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 32, backgroundColor: "#fff" },
  title: { marginBottom: 16, textAlign: "center" },
  hint: { marginBottom: 24, textAlign: "center", fontSize: 12, color: "#666" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 16 },
});