import React, { useState, useEffect } from "react";
import { Modal, View, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
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

type OperatorFormModalProps = {
  visible: boolean;
  operator?: Operator | null;
  onClose: () => void;
  onSave: (operatorData: any) => void;
};

export default function OperatorFormModal({ 
  visible, 
  operator, 
  onClose, 
  onSave 
}: OperatorFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (operator) {
      setFormData({
        name: operator.name,
        username: operator.username,
        email: operator.email,
        phone: operator.phone,
        password: "",
        confirmPassword: "",
      });
    } else {
      setFormData({
        name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    }
    setErrors({});
  }, [operator, visible]);

  const validateForm = () => {
  const newErrors: any = {};

  // Validaciones obligatorias
  if (!formData.name.trim()) {
    newErrors.name = "El nombre es requerido";
  }

  if (!formData.username.trim()) {
    newErrors.username = "El nombre de usuario es requerido";
  } else if (formData.username.length < 3) {
    newErrors.username = "El nombre de usuario debe tener al menos 3 caracteres";
  }

  // Email opcional pero debe ser válido si se proporciona
  if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
    newErrors.email = "Email inválido";
  }

  // Teléfono opcional pero debe tener formato válido si se proporciona
  if (formData.phone.trim() && formData.phone.length < 9) {
    newErrors.phone = "Teléfono debe tener al menos 9 dígitos";
  }

  // Validar contraseña solo para nuevos operadores
  if (!operator) {
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        ...formData,
        id: operator?.id || Date.now().toString(),
        isActive: operator?.isActive ?? true,
        totalVehiclesProcessed: operator?.totalVehiclesProcessed || 0,
        totalEarnings: operator?.totalEarnings || 0,
      });
      onClose();
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      "Cancelar",
      "¿Estás seguro de que quieres cancelar? Se perderán los cambios no guardados.",
      [
        { text: "Continuar editando", style: "cancel" },
        { text: "Cancelar", style: "destructive", onPress: onClose },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={confirmCancel}>
            <MaterialIcons name="close" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <ThemedView style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>
              {operator ? "Editar Operador" : "Nuevo Operador"}
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {operator ? "Modificar información del operador" : "Registrar nuevo operador"}
            </ThemedText>
          </ThemedView>
          <TouchableOpacity onPress={handleSave}>
            <MaterialIcons name="check" size={24} color="#2E7D32" />
          </TouchableOpacity>
        </ThemedView>

        <ScrollView style={styles.contentContainer}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Información Personal</ThemedText>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Nombre Completo *</ThemedText>
              <TextInput
                style={[styles.filterInput, errors.name && { borderColor: "#FF6B35" }]}
                placeholder="Ej: Juan Pérez"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              {errors.name && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.name}</ThemedText>}
            </View>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Email (opcional)</ThemedText>
              <TextInput
                style={[styles.filterInput, errors.email && { borderColor: "#FF6B35" }]}
                placeholder="operador@empresa.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.email}</ThemedText>}
            </View>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Teléfono (opcional)</ThemedText>
              <TextInput
                style={[styles.filterInput, errors.phone && { borderColor: "#FF6B35" }]}
                placeholder="999 999 999"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
              {errors.phone && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.phone}</ThemedText>}
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Datos de Acceso</ThemedText>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Nombre de Usuario *</ThemedText>
              <TextInput
                style={[styles.filterInput, errors.username && { borderColor: "#FF6B35" }]}
                placeholder="usuario123"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
              />
              {errors.username && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.username}</ThemedText>}
            </View>

            {!operator && (
              <>
                <View style={{ marginBottom: 16 }}>
                  <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Contraseña *</ThemedText>
                  <TextInput
                    style={[styles.filterInput, errors.password && { borderColor: "#FF6B35" }]}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry
                  />
                  {errors.password && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.password}</ThemedText>}
                </View>

                <View style={{ marginBottom: 16 }}>
                  <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Confirmar Contraseña *</ThemedText>
                  <TextInput
                    style={[styles.filterInput, errors.confirmPassword && { borderColor: "#FF6B35" }]}
                    placeholder="Repetir contraseña"
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                    secureTextEntry
                  />
                  {errors.confirmPassword && <ThemedText style={{ color: "#FF6B35", fontSize: 12 }}>{errors.confirmPassword}</ThemedText>}
                </View>
              </>
            )}

            {operator && (
              <ThemedText style={{ fontSize: 14, color: "#666", fontStyle: "italic" }}>
                Para cambiar la contraseña, el operador debe solicitarlo al administrador
              </ThemedText>
            )}
          </ThemedView>

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <ThemedText style={styles.buttonText}>
              {operator ? "Guardar Cambios" : "Crear Operador"}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}