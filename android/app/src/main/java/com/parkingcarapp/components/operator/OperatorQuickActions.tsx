import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { operatorStyles as styles } from "../../styles/OperatorScreen.styles";

export default function OperatorQuickActions({ onEntry, onExit }: { onEntry: () => void; onExit: () => void }) {
  return (
    <ThemedView style={styles.actionsContainer}>
      <ThemedText style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.entryButton]} onPress={onEntry}>
          <MaterialIcons name="add-circle" size={32} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Registrar{"\n"}Entrada</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.exitButton]} onPress={onExit}>
          <MaterialIcons name="remove-circle" size={32} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Procesar{"\n"}Salida</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}