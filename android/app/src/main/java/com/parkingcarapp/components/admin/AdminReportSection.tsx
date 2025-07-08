import React from "react";
import { View } from "react-native";
import { ThemedText } from "../common/ThemedText";
export default function AdminReportSection() {
  return (
    <View>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Reporte de Vehículos Registrados</ThemedText>
      {/* Aquí puedes agregar filtros por operador y fecha */}
      <ThemedText>Filtrar por operador y fecha, mostrar tabla o lista de registros.</ThemedText>
      {/* Aquí irá la tabla/lista de registros */}
    </View>
  );
}