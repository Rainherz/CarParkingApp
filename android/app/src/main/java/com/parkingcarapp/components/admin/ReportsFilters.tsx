import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import DatePickerField from "../common/DatePickerField"; 
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminSharedStyles as styles } from "../../styles/AdminShared.styles";

type ReportsFiltersProps = {
  onFilterChange: (filters: any) => void;
  operators: Array<{ id: string; name: string }>;
};

export default function ReportsFilters({ onFilterChange, operators }: ReportsFiltersProps) {
  const [selectedOperator, setSelectedOperator] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);

  // Agregar opción "Todos" al inicio de la lista
  const operatorsWithAll = [
    { id: "all", name: "Todos los operadores" },
    ...operators
  ];

  const applyFilters = () => {
    onFilterChange({
      operator: selectedOperator,
      startDate,
      endDate,
    });
  };

  const clearFilters = () => {
    setSelectedOperator("all");
    setStartDate("");
    setEndDate("");
    onFilterChange({
      operator: "all",
      startDate: "",
      endDate: "",
    });
  };

  const selectedOperatorName = operatorsWithAll.find(op => op.id === selectedOperator)?.name || "Seleccionar";

  return (
    <ThemedView style={styles.filterContainer}>
      <ThemedText style={styles.sectionTitle}>
        <MaterialIcons name="filter-list" size={18} color="#333" /> Filtros de Reporte
      </ThemedText>
      
      {/* Selector de Operador */}
      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Operador:</ThemedText>
        <TouchableOpacity 
          style={[styles.filterInput, { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }]}
          onPress={() => setShowOperatorPicker(!showOperatorPicker)}
        >
          <ThemedText style={{ flex: 1 }}>{selectedOperatorName}</ThemedText>
          <MaterialIcons 
            name={showOperatorPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      {showOperatorPicker && (
        <View style={{ marginBottom: 16 }}>
          {operatorsWithAll.map(operator => (
            <TouchableOpacity 
              key={operator.id}
              style={[
                styles.listItem,
                selectedOperator === operator.id && { 
                  backgroundColor: '#e8f5e8',
                  borderColor: '#2E7D32',
                  borderWidth: 1
                }
              ]}
              onPress={() => {
                setSelectedOperator(operator.id);
                setShowOperatorPicker(false);
              }}
            >
              <ThemedText style={{
                color: selectedOperator === operator.id ? '#2E7D32' : '#333',
                fontWeight: selectedOperator === operator.id ? '600' : 'normal'
              }}>
                {operator.name}
              </ThemedText>
              {selectedOperator === operator.id && (
                <MaterialIcons name="check-circle" size={20} color="#2E7D32" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ⬇️ CAMPOS DE FECHA CON DatePickerField mejorado */}
      <View style={{ marginBottom: 16 }}>
        <DatePickerField
          label="📅 Fecha Desde"
          value={startDate}
          onDateChange={setStartDate}
          placeholder="Seleccionar fecha inicial"
        />
      </View>

      <View style={{ marginBottom: 20 }}>
        <DatePickerField
          label="📅 Fecha Hasta"
          value={endDate}
          onDateChange={setEndDate}
          placeholder="Seleccionar fecha final"
        />
      </View>

      {/* Botones de acción mejorados */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.button, { 
            flex: 1, 
            marginRight: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }]} 
          onPress={applyFilters}
        >
          <MaterialIcons name="search" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Aplicar Filtros</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary, { 
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }]} 
          onPress={clearFilters}
        >
          <MaterialIcons name="clear" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Limpiar</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Información de filtros activos */}
      {(selectedOperator !== "all" || startDate || endDate) && (
        <View style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#f0f8ff',
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: '#2E7D32'
        }}>
          <ThemedText style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>
            Filtros activos:
          </ThemedText>
          {selectedOperator !== "all" && (
            <ThemedText style={{ fontSize: 12, color: '#2E7D32' }}>
              • Operador: {selectedOperatorName}
            </ThemedText>
          )}
          {startDate && (
            <ThemedText style={{ fontSize: 12, color: '#2E7D32' }}>
              • Desde: {new Date(startDate).toLocaleDateString('es-PE')}
            </ThemedText>
          )}
          {endDate && (
            <ThemedText style={{ fontSize: 12, color: '#2E7D32' }}>
              • Hasta: {new Date(endDate).toLocaleDateString('es-PE')}
            </ThemedText>
          )}
        </View>
      )}
    </ThemedView>
  );
}