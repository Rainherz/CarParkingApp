import React, { useEffect, useState } from "react";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import { operatorStyles as styles } from "../../styles/OperatorScreen.styles";

export default function OperatorClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ThemedView style={styles.timeContainer}>
      <ThemedText style={styles.currentTime}>
        {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </ThemedText>
      <ThemedText style={styles.currentDate}>
        {currentTime.toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </ThemedText>
    </ThemedView>
  );
}