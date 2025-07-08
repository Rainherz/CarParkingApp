import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminSharedStyles as styles } from "../../styles/AdminShared.styles";

// Componente para configuración de tarifas
export function TariffsSection({ settings, onUpdate }: any) {
  const [tariffs, setTariffs] = useState(settings.tariffs || {
    firstHour: 5.00,
    additionalHour: 3.00,
    maxDailyRate: 25.00,
    nightRate: 2.00,
    weekendMultiplier: 1.2,
  });

  const handleSave = () => {
    onUpdate("tariffs", tariffs);
    Alert.alert("Éxito", "Tarifas actualizadas correctamente");
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.sectionTitle}>Configuración de Tarifas</ThemedText>
      
      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Primera Hora (S/)</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={tariffs.firstHour.toString()}
          onChangeText={(text) => setTariffs({...tariffs, firstHour: parseFloat(text) || 0})}
          keyboardType="decimal-pad"
          placeholder="5.00"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Hora Adicional (S/)</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={tariffs.additionalHour.toString()}
          onChangeText={(text) => setTariffs({...tariffs, additionalHour: parseFloat(text) || 0})}
          keyboardType="decimal-pad"
          placeholder="3.00"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Tarifa Máxima Diaria (S/)</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={tariffs.maxDailyRate.toString()}
          onChangeText={(text) => setTariffs({...tariffs, maxDailyRate: parseFloat(text) || 0})}
          keyboardType="decimal-pad"
          placeholder="25.00"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Tarifa Nocturna (S/)</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={tariffs.nightRate.toString()}
          onChangeText={(text) => setTariffs({...tariffs, nightRate: parseFloat(text) || 0})}
          keyboardType="decimal-pad"
          placeholder="2.00"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <ThemedText style={styles.buttonText}>Guardar Tarifas</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

// Componente para información del negocio
export function BusinessInfoSection({ settings, onUpdate }: any) {
  const [businessInfo, setBusinessInfo] = useState(settings.businessInfo || {
    name: "AutoParking Control",
    address: "Av. Principal 123, Arequipa",
    phone: "054-123456",
    email: "info@autoparking.com",
    ruc: "20123456789",
    maxSpots: 50,
  });

  const handleSave = () => {
    onUpdate("businessInfo", businessInfo);
    Alert.alert("Éxito", "Información del negocio actualizada");
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.sectionTitle}>Información del Negocio</ThemedText>
      
      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Nombre del Negocio</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.name}
          onChangeText={(text) => setBusinessInfo({...businessInfo, name: text})}
          placeholder="AutoParking Control"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Dirección</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.address}
          onChangeText={(text) => setBusinessInfo({...businessInfo, address: text})}
          placeholder="Av. Principal 123, Arequipa"
          multiline
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Teléfono</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.phone}
          onChangeText={(text) => setBusinessInfo({...businessInfo, phone: text})}
          placeholder="054-123456"
          keyboardType="phone-pad"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Email</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.email}
          onChangeText={(text) => setBusinessInfo({...businessInfo, email: text})}
          placeholder="info@autoparking.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>RUC</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.ruc}
          onChangeText={(text) => setBusinessInfo({...businessInfo, ruc: text})}
          placeholder="20123456789"
          keyboardType="numeric"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Espacios Máximos</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={businessInfo.maxSpots.toString()}
          onChangeText={(text) => setBusinessInfo({...businessInfo, maxSpots: parseInt(text) || 0})}
          placeholder="50"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <ThemedText style={styles.buttonText}>Guardar Información</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

// Componente para configuraciones del sistema
export function SystemConfigSection({ settings, onUpdate }: any) {
  const [systemConfig, setSystemConfig] = useState(settings.systemConfig || {
    autoBackup: true,
    printTickets: true,
    useOCR: true,
    soundAlerts: true,
    maxLoginAttempts: 3,
    sessionTimeout: 30,
    language: "es",
  });

  const handleToggle = (key: string, value: boolean) => {
    const newConfig = { ...systemConfig, [key]: value };
    setSystemConfig(newConfig);
    onUpdate("systemConfig", newConfig);
  };

  const handleSave = () => {
    onUpdate("systemConfig", systemConfig);
    Alert.alert("Éxito", "Configuración del sistema actualizada");
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.sectionTitle}>Configuración del Sistema</ThemedText>
      
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ThemedText style={{ fontWeight: "600" }}>Respaldo Automático</ThemedText>
        <Switch
          value={systemConfig.autoBackup}
          onValueChange={(value) => handleToggle("autoBackup", value)}
          trackColor={{ false: "#767577", true: "#2E7D32" }}
          thumbColor={systemConfig.autoBackup ? "#4CAF50" : "#f4f3f4"}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ThemedText style={{ fontWeight: "600" }}>Imprimir Tickets</ThemedText>
        <Switch
          value={systemConfig.printTickets}
          onValueChange={(value) => handleToggle("printTickets", value)}
          trackColor={{ false: "#767577", true: "#2E7D32" }}
          thumbColor={systemConfig.printTickets ? "#4CAF50" : "#f4f3f4"}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ThemedText style={{ fontWeight: "600" }}>Reconocimiento OCR</ThemedText>
        <Switch
          value={systemConfig.useOCR}
          onValueChange={(value) => handleToggle("useOCR", value)}
          trackColor={{ false: "#767577", true: "#2E7D32" }}
          thumbColor={systemConfig.useOCR ? "#4CAF50" : "#f4f3f4"}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ThemedText style={{ fontWeight: "600" }}>Alertas Sonoras</ThemedText>
        <Switch
          value={systemConfig.soundAlerts}
          onValueChange={(value) => handleToggle("soundAlerts", value)}
          trackColor={{ false: "#767577", true: "#2E7D32" }}
          thumbColor={systemConfig.soundAlerts ? "#4CAF50" : "#f4f3f4"}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Intentos Máximos de Login</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={systemConfig.maxLoginAttempts.toString()}
          onChangeText={(text) => setSystemConfig({...systemConfig, maxLoginAttempts: parseInt(text) || 3})}
          keyboardType="numeric"
          placeholder="3"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Tiempo de Sesión (minutos)</ThemedText>
        <TextInput
          style={styles.filterInput}
          value={systemConfig.sessionTimeout.toString()}
          onChangeText={(text) => setSystemConfig({...systemConfig, sessionTimeout: parseInt(text) || 30})}
          keyboardType="numeric"
          placeholder="30"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <ThemedText style={styles.buttonText}>Guardar Configuración</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}