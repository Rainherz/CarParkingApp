import React from "react";
import { TouchableOpacity } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

export default function OperatorLogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <TouchableOpacity
      style={{ position: "absolute", top: 40, right: 20 }}
      onPress={onLogout}
    >
      <MaterialIcons name="logout" size={32} color="#FF6B35" />
    </TouchableOpacity>
  );
}