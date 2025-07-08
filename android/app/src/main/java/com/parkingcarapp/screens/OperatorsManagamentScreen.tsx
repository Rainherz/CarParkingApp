import React, { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, Alert, View } from "react-native";
import { ThemedView } from "../components/common/ThemedView";
import { ThemedText } from "../components/common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AdminScreenHeader from "../components/admin/AdminScreenHeader";
import OperatorsList from "../components/admin/OperatorsList";
import OperatorFormModal from "../components/admin/OperatorFormModal";
import { adminSharedStyles as styles } from "../styles/AdminShared.styles";
import { databaseService } from "../services/databaseService";

interface OperatorsManagementScreenProps {
  onBack: () => void;
}

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

export default function OperatorsManagementScreen({ onBack }: OperatorsManagementScreenProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔧 CARGAR OPERADORES MEJORADO
  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setIsLoading(true);
      const ops = await databaseService.getOperators();
      // Filtrar la opción "all" que se usa en reportes
      const validOperators = ops.filter((op: any) => op.id !== "all");
      setOperators(validOperators);
    } catch (error) {
      console.error('Error cargando operadores:', error);
      Alert.alert("Error", "No se pudieron cargar los operadores");
      setOperators([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOperator = () => {
    setSelectedOperator(null);
    setShowForm(true);
  };

  const handleEditOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setShowForm(true);
  };

  // 🔧 MEJORAR MANEJO DE GUARDADO
  const handleSaveOperator = async (operatorData: any) => {
    try {
      if (selectedOperator) {
        // Editar operador existente
        await databaseService.updateOperator({
          id: selectedOperator.id,
          name: operatorData.name,
          username: operatorData.username,
          email: operatorData.email,
          phone: operatorData.phone
        });
        Alert.alert("Éxito", "Operador actualizado correctamente");
      } else {
        // Agregar nuevo operador
        await databaseService.addOperator({
          name: operatorData.name,
          username: operatorData.username,
          email: operatorData.email,
          phone: operatorData.phone,
          password: operatorData.password
        });
        Alert.alert("Éxito", "Nuevo operador creado correctamente");
      }
      setShowForm(false);
      fetchOperators(); // Recargar lista
    } catch (error) {
      console.error('Error guardando operador:', error);
      Alert.alert("Error", "No se pudo guardar el operador. Verifique que el nombre de usuario no esté duplicado.");
    }
  };

  // 🔧 MEJORAR TOGGLE DE ESTADO
  const handleToggleOperatorStatus = async (operatorId: string) => {
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;

    const action = operator.isActive ? "desactivar" : "activar";
    const actionTitle = operator.isActive ? "Desactivar Operador" : "Activar Operador";

    Alert.alert(
      actionTitle,
      `¿Estás seguro de que quieres ${action} a ${operator.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: operator.isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              await databaseService.setOperatorStatus(operatorId, !operator.isActive);
              fetchOperators(); // Recargar lista
              Alert.alert("Éxito", `Operador ${action}do correctamente`);
            } catch (error) {
              console.error('Error cambiando estado:', error);
              Alert.alert("Error", "No se pudo cambiar el estado del operador");
            }
          },
        },
      ]
    );
  };

  // 🔧 MEJORAR VISUALIZACIÓN DE ESTADÍSTICAS
  const handleViewOperatorStats = (operator: Operator) => {
    Alert.alert(
      `Estadísticas de ${operator.name}`,
      `👤 Usuario: ${operator.username}\n` +
      `📧 Email: ${operator.email || 'No especificado'}\n` +
      `📱 Teléfono: ${operator.phone || 'No especificado'}\n` +
      `🚗 Vehículos procesados: ${operator.totalVehiclesProcessed}\n` +
      `💰 Ingresos generados: S/ ${operator.totalEarnings.toFixed(2)}\n` +
      `🔄 Estado: ${operator.isActive ? "Activo" : "Inactivo"}\n` +
      `⏰ Último acceso: ${operator.lastLogin || "Nunca"}`,
      [{ text: "Cerrar" }]
    );
  };

  const activeOperators = operators.filter(op => op.isActive);
  const inactiveOperators = operators.filter(op => !op.isActive);
  const totalVehiclesProcessed = operators.reduce((sum, op) => sum + (op.totalVehiclesProcessed || 0), 0);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <AdminScreenHeader
          title="Gestión de Operadores"
          subtitle="Cargando..."
          onBack={onBack}
        />
        <ThemedView style={[styles.card, { margin: 16, alignItems: 'center', paddingVertical: 40 }]}>
          <MaterialIcons name="hourglass-empty" size={48} color="#ccc" />
          <ThemedText style={{ color: '#999', marginTop: 12 }}>Cargando operadores...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <AdminScreenHeader
        title="Gestión de Operadores"
        subtitle="Administrar personal y permisos"
        onBack={onBack}
        rightAction={fetchOperators}
        rightIcon="refresh"
      />

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* 🔧 ESTADÍSTICAS MEJORADAS */}
        <ThemedView style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            <MaterialIcons name="people" size={18} color="#333" /> Resumen de Operadores
          </ThemedText>
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
            <View style={{ alignItems: "center" }}>
              <ThemedText style={{ fontSize: 24, fontWeight: "bold", color: "#4CAF50" }}>
                {activeOperators.length}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: "#666" }}>Activos</ThemedText>
            </View>
            <View style={{ alignItems: "center" }}>
              <ThemedText style={{ fontSize: 24, fontWeight: "bold", color: "#FF6B35" }}>
                {inactiveOperators.length}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: "#666" }}>Inactivos</ThemedText>
            </View>
            <View style={{ alignItems: "center" }}>
              <ThemedText style={{ fontSize: 24, fontWeight: "bold", color: "#2E7D32" }}>
                {totalVehiclesProcessed}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: "#666" }}>Vehículos Total</ThemedText>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleAddOperator}>
            <ThemedText style={styles.buttonText}>
              <MaterialIcons name="person-add" size={16} color="#fff" /> Agregar Nuevo Operador
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Lista de Operadores */}
        <OperatorsList
          operators={operators}
          onEdit={handleEditOperator}
          onToggleStatus={handleToggleOperatorStatus}
          onViewStats={handleViewOperatorStats}
        />
      </ScrollView>

      {/* Modal de Formulario */}
      <OperatorFormModal
        visible={showForm}
        operator={selectedOperator}
        onClose={() => setShowForm(false)}
        onSave={handleSaveOperator}
      />
    </ThemedView>
  );
}