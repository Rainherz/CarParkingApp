import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminSharedStyles as styles } from "../../styles/AdminShared.styles";

type ReportsListProps = {
  reports: Array<{
    id: string;
    plateNumber: string;
    operatorName: string;
    entryTime: string;
    exitTime?: string;
    duration?: string;
    amount: number;
    status: "active" | "completed";
  }>;
  onExportData: () => void;
  isLoading: boolean;
};

export default function ReportsList({ reports, onExportData, isLoading }: ReportsListProps) {
  const completedReports = reports.filter(r => r.status === "completed");
  const totalEarnings = completedReports.reduce((sum, r) => sum + r.amount, 0);
  const averageAmount = completedReports.length > 0 ? totalEarnings / completedReports.length : 0;

  return (
    <>
      {/* Estadísticas Resumidas */}
      <ThemedView style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Resumen del Período</ThemedText>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ alignItems: "center" }}>
            <ThemedText style={{ fontSize: 20, fontWeight: "bold", color: "#2E7D32" }}>
              {reports.length}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: "#666" }}>Total Registros</ThemedText>
          </View>
          <View style={{ alignItems: "center" }}>
            <ThemedText style={{ fontSize: 20, fontWeight: "bold", color: "#4CAF50" }}>
              S/ {totalEarnings.toFixed(2)}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: "#666" }}>Ingresos Totales</ThemedText>
          </View>
          <View style={{ alignItems: "center" }}>
            <ThemedText style={{ fontSize: 20, fontWeight: "bold", color: "#FF6B35" }}>
              S/ {averageAmount.toFixed(2)}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: "#666" }}>Promedio por Vehículo</ThemedText>
          </View>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={onExportData}>
          <ThemedText style={styles.buttonText}>
            <MaterialIcons name="file-download" size={16} color="#fff" /> Exportar Datos
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Lista de Registros */}
      <ThemedView style={styles.card}>
        <ThemedText style={styles.sectionTitle}>
          Registros de Vehículos ({reports.length})
        </ThemedText>

        {isLoading ? (
          <ThemedView style={styles.emptyState}>
            <MaterialIcons name="hourglass-empty" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText}>Cargando reportes...</ThemedText>
          </ThemedView>
        ) : reports.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <MaterialIcons name="receipt" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText}>
              No se encontraron registros para los filtros seleccionados
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView style={{ maxHeight: 400 }}>
            {reports.map((report) => (
              <ThemedView key={report.id} style={styles.listItem}>
                <ThemedView style={styles.listItemContent}>
                  <ThemedText style={styles.listItemTitle}>
                    {report.plateNumber}
                  </ThemedText>
                  <ThemedText style={styles.listItemSubtitle}>
                    Operador: {report.operatorName}
                  </ThemedText>
                  <ThemedText style={styles.listItemSubtitle}>
                    Entrada: {report.entryTime}
                  </ThemedText>
                  {report.exitTime && (
                    <ThemedText style={styles.listItemSubtitle}>
                      Salida: {report.exitTime} • {report.duration}
                    </ThemedText>
                  )}
                </ThemedView>
                <ThemedView style={{ alignItems: "flex-end" }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: "bold", color: "#4CAF50" }}>
                    S/ {report.amount.toFixed(2)}
                  </ThemedText>
                  <ThemedView style={{
                    backgroundColor: report.status === "active" ? "#FF6B35" : "#4CAF50",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginTop: 4,
                  }}>
                    <ThemedText style={{ color: "#fff", fontSize: 12 }}>
                      {report.status === "active" ? "Activo" : "Completado"}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </>
  );
}