import React from "react";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { operatorStyles as styles } from "../../styles/OperatorScreen.styles";

type OperatorHeaderProps = {
  onRefresh: () => void;
};

export default function OperatorHeader({ onRefresh }: OperatorHeaderProps) {
  return (
    <ThemedView style={styles.header}>
      <MaterialIcons name="local-parking" size={40} color="#2E7D32" style={styles.headerIcon} />
      <ThemedView style={styles.headerTextContainer}>
        <ThemedText style={styles.headerTitle}>AutoParking Control</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Sistema de Control de Estacionamiento</ThemedText>
      </ThemedView>
      <MaterialIcons name="refresh" size={24} color="#666" onPress={onRefresh} />
    </ThemedView>
  );
}