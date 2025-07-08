import React from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminSharedStyles as styles } from "../../styles/AdminShared.styles";

type Operator = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastLogin?: string;
  totalVehiclesProcessed: number;
  totalEarnings: number;
};

type OperatorsListProps = {
  operators: Operator[];
  onEdit: (operator: Operator) => void;
  onToggleStatus: (operatorId: string) => void;
  onViewStats: (operator: Operator) => void;
};

export default function OperatorsList({
  operators,
  onEdit,
  onToggleStatus,
  onViewStats
}: OperatorsListProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.sectionTitle}>
        Lista de Operadores ({operators.length})
      </ThemedText>

      {operators.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <MaterialIcons name="people" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>
            No hay operadores registrados
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView style={{ maxHeight: 500 }}>
          {operators.map((operator) => (
            <ThemedView key={operator.id} style={styles.listItem}>
              <ThemedView style={styles.listItemContent}>
                <ThemedText style={styles.listItemTitle}>
                  {operator.name}
                  {!operator.isActive && (
                    <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}> (Inactivo)</ThemedText>
                  )}
                </ThemedText>
                <ThemedText style={styles.listItemSubtitle}>
                  Usuario: {operator.username}
                  {operator.email && ` • Email: ${operator.email}`}
                </ThemedText>
                {operator.phone && (
                  <ThemedText style={styles.listItemSubtitle}>
                    Teléfono: {operator.phone}
                  </ThemedText>
                )}
                <ThemedText style={styles.listItemSubtitle}>
                  Vehículos procesados: {operator.totalVehiclesProcessed || 0} •
                  Ingresos: S/ {(operator.totalEarnings || 0).toFixed(2)}
                </ThemedText>
                {operator.lastLogin && (
                  <ThemedText style={styles.listItemSubtitle}>
                    Último acceso: {operator.lastLogin}
                  </ThemedText>
                )}
              </ThemedView>

              <ThemedView style={styles.listItemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onViewStats(operator)}
                  disabled={false}
                >
                  <MaterialIcons name="bar-chart" size={20} color="#1976D2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(operator)}
                >
                  <MaterialIcons name="edit" size={20} color="#2E7D32" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onToggleStatus(operator.id)}
                >
                  <MaterialIcons
                    name={operator.isActive ? "visibility-off" : "visibility"}
                    size={20}
                    color={operator.isActive ? "#FF6B35" : "#4CAF50"}
                  />
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}