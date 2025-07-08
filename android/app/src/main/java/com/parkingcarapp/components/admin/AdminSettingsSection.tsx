import React from "react";
import { View } from "react-native";
import { ThemedText } from "../common/ThemedText";

export default function AdminSettingsSection() {
  return (
    <View>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Configuración General</ThemedText>
      {/* Aquí puedes modificar parámetros del sistema */}
      <ThemedText>Modificar parámetros del sistema (tarifa, datos del negocio, etc).</ThemedText>
      {/* Aquí irá el formulario de configuración */}
    </View>
  );
}