import React, { useEffect, useState } from 'react';
import { 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  useColorScheme, 
  ActivityIndicator, 
  View,
  Text,
  Animated,
  Easing
} from 'react-native';
import OperatorScreen from './android/app/src/main/java/com/parkingcarapp/screens/OperatorScreen';
import AdminScreen from './android/app/src/main/java/com/parkingcarapp/screens/AdminScreen';
import LoginScreen from './android/app/src/main/java/com/parkingcarapp/screens/LoginScreen';
import ReportsScreen from './android/app/src/main/java/com/parkingcarapp/screens/ReportsScreen';
import OperatorsManagementScreen from './android/app/src/main/java/com/parkingcarapp/screens/OperatorsManagamentScreen';
import SystemSettingsScreen from './android/app/src/main/java/com/parkingcarapp/screens/SystemSettingsScreen';
import { databaseService } from './android/app/src/main/java/com/parkingcarapp/services/databaseService';

type AdminScreenType = 'main' | 'reports' | 'operators' | 'settings';

// ⬇️ COMPONENTE LOADING MEJORADO
function LoadingScreen({ isDarkMode }: { isDarkMode: boolean }) {
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const scaleValue = React.useRef(new Animated.Value(0.8)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animación de entrada
    Animated.sequence([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de rotación continua
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDarkMode 
        ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' 
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    loadingContent: {
      backgroundColor: isDarkMode ? 'rgba(30, 60, 114, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      shadowColor: isDarkMode ? '#000' : '#667eea',
    },
    loadingText: {
      color: isDarkMode ? '#ffffff' : '#333333',
    },
    subtitleText: {
      color: isDarkMode ? '#b0c4de' : '#666666',
    },
  });

  return (
    <View style={[styles.loadingContainer, dynamicStyles.container]}>
      <Animated.View style={[
        styles.loadingContent, 
        dynamicStyles.loadingContent,
        { 
          opacity: opacityValue, 
          transform: [{ scale: scaleValue }] 
        }
      ]}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </Animated.View>
        
        <Animated.Text style={[styles.loadingText, dynamicStyles.loadingText]}>
          AutoParking Control
        </Animated.Text>
        
        <Animated.Text style={[styles.loadingSubtitle, dynamicStyles.subtitleText]}>
          Inicializando sistema...
        </Animated.Text>
        
        <View style={styles.loadingBar}>
          <View style={styles.loadingBarFill} />
        </View>
      </Animated.View>
    </View>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [dbReady, setDbReady] = useState(false);
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [currentAdminScreen, setCurrentAdminScreen] = useState<AdminScreenType>('main');
  
  // ⬇️ ANIMACIÓN PARA TRANSICIONES
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    databaseService.initDatabase().then(() => {
      // Pequeño delay para mostrar la pantalla de loading
      setTimeout(() => setDbReady(true), 1500);
    });
  }, []);

  // ⬇️ FUNCIONES CON ANIMACIONES DE TRANSICIÓN
  const handleLogout = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setUser(null);
      setCurrentAdminScreen('main');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const navigateWithAnimation = (screen: AdminScreenType) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentAdminScreen(screen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNavigateToReports = () => navigateWithAnimation('reports');
  const handleNavigateToOperators = () => navigateWithAnimation('operators');
  const handleNavigateToSettings = () => navigateWithAnimation('settings');
  const handleBackToAdmin = () => navigateWithAnimation('main');

  // ⬇️ PANTALLA DE LOADING MEJORADA
  if (!dbReady) {
    return <LoadingScreen isDarkMode={isDarkMode} />;
  }

  let content = <LoginScreen onLoginSuccess={setUser} />;

  if (user) {
    if (user.role === 'admin') {
      switch (currentAdminScreen) {
        case 'reports':
          content = <ReportsScreen onBack={handleBackToAdmin} />;
          break;
        case 'operators':
          content = <OperatorsManagementScreen onBack={handleBackToAdmin} />;
          break;
        case 'settings':
          content = <SystemSettingsScreen onBack={handleBackToAdmin} />;
          break;
        default: 
          content = (
            <AdminScreen 
              user={user} 
              onLogout={handleLogout}
              onNavigateToReports={handleNavigateToReports}      
              onNavigateToOperators={handleNavigateToOperators} 
              onNavigateToSettings={handleNavigateToSettings}   
            />
          );
          break;
      }
    } else {
      content = <OperatorScreen onLogout={handleLogout} />;
    }
  }

  // ⬇️ ESTILOS DINÁMICOS SEGÚN MODO
  const dynamicContainerStyle = {
    backgroundColor: isDarkMode ? '#121212' : '#ffffff',
  };

  const dynamicStatusBarStyle = isDarkMode ? 'light-content' : 'dark-content';
  const dynamicStatusBarBackground = isDarkMode ? '#000000' : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, dynamicContainerStyle]}>
      <StatusBar
        barStyle={dynamicStatusBarStyle}
        backgroundColor={dynamicStatusBarBackground}
        translucent={false}
      />
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {content}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  // ⬇️ ESTILOS DE LOADING MEJORADOS
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 280,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});