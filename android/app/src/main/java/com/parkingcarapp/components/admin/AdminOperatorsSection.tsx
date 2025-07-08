import React from "react";
import { View } from "react-native";
import { ThemedText } from "../common/ThemedText";

export default function AdminOperatorsSection() {
  return (
    <View>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Gestión de Operadores</ThemedText>
      {/* Aquí puedes listar, crear, editar y eliminar operadores */}
      <ThemedText>Agregar, editar y eliminar operadores (eliminación lógica).</ThemedText>
      {/* Aquí irá la lista y los formularios/modales para operadores */}
    </View>
  );
}