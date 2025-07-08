import React from "react";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { operatorStyles as styles } from "../../styles/OperatorScreen.styles";

export default function OperatorStats({ dailySummary }: { dailySummary: any }) {
  return (
    <ThemedView style={styles.statsContainer}>
      <ThemedText style={styles.sectionTitle}>Estadísticas de Hoy</ThemedText>
      <ThemedView style={styles.statsGrid}>
        <ThemedView style={styles.statCard}>
          <MaterialIcons name="directions-car" size={24} color="#2E7D32" />
          <ThemedText style={styles.statNumber}>{dailySummary.vehiclesParked}</ThemedText>
          <ThemedText style={styles.statLabel}>Vehículos Activos</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <MaterialIcons name="arrow-downward" size={24} color="#FF6B35" />
          <ThemedText style={styles.statNumber}>{dailySummary.totalVehicles}</ThemedText>
          <ThemedText style={styles.statLabel}>Entradas Total</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
          <ThemedText style={styles.statNumber}>S/ {dailySummary.totalEarnings?.toFixed(2)}</ThemedText>
          <ThemedText style={styles.statLabel}>Ingresos del Día</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <MaterialIcons name="access-time" size={24} color="#9C27B0" />
          <ThemedText style={styles.statNumber}>{dailySummary.averageStay}</ThemedText>
          <ThemedText style={styles.statLabel}>Tiempo Promedio</ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}