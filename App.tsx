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
  Easing,
  TouchableOpacity
} from 'react-native';
import  OperatorScreen  from './android/app/src/main/java/com/parkingcarapp/screens/OperatorScreen';
import AdminScreen from './android/app/src/main/java/com/parkingcarapp/screens/AdminScreen';
import LoginScreen from './android/app/src/main/java/com/parkingcarapp/screens/LoginScreen';
import ReportsScreen from './android/app/src/main/java/com/parkingcarapp/screens/ReportsScreen';
import OperatorsManagementScreen from './android/app/src/main/java/com/parkingcarapp/screens/OperatorsManagamentScreen';
import SystemSettingsScreen from './android/app/src/main/java/com/parkingcarapp/screens/SystemSettingsScreen';
import { databaseService } from './android/app/src/main/java/com/parkingcarapp/services/databaseService';

type AdminScreenType = 'main' | 'reports' | 'operators' | 'settings';
type AppState = 'loading' | 'ready' | 'error';

// ⬇️ COMPONENTE LOADING MEJORADO CON ESTADOS + CONECTIVIDAD
function LoadingScreen({ 
  isDarkMode, 
  initProgress, 
  error, 
  onRetry,
  isOfflineMode = false
}: { 
  isDarkMode: boolean;
  initProgress: string;
  error: string | null;
  onRetry: () => void;
  isOfflineMode?: boolean;
}) {
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

    // Animación de rotación continua (solo si no hay error)
    if (!error) {
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
    }
  }, [error]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDarkMode 
        ? (error ? '#4a1a1a' : isOfflineMode ? '#2d4a22' : '#1e3c72')
        : (error ? '#ffeaea' : isOfflineMode ? '#e8f5e8' : '#667eea'),
    },
    loadingContent: {
      backgroundColor: isDarkMode 
        ? (error ? 'rgba(139, 69, 19, 0.9)' : isOfflineMode ? 'rgba(45, 74, 34, 0.9)' : 'rgba(30, 60, 114, 0.9)')
        : (error ? 'rgba(255, 235, 235, 0.95)' : isOfflineMode ? 'rgba(232, 245, 232, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
      shadowColor: isDarkMode ? '#000' : (error ? '#d32f2f' : isOfflineMode ? '#2E7D32' : '#667eea'),
    },
    loadingText: {
      color: isDarkMode 
        ? (error ? '#ffcccb' : '#ffffff')
        : (error ? '#d32f2f' : '#333333'),
    },
    subtitleText: {
      color: isDarkMode 
        ? (error ? '#ffb3b3' : isOfflineMode ? '#90ee90' : '#b0c4de')
        : (error ? '#f57c00' : isOfflineMode ? '#2E7D32' : '#666666'),
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
        {error ? (
          // Estado de error
          <>
            <Text style={[styles.errorIcon]}>⚠️</Text>
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>
              Error de Inicialización
            </Text>
            <Text style={[styles.loadingSubtitle, dynamicStyles.subtitleText]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Estado de carga normal
          <>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <ActivityIndicator size="large" color={isOfflineMode ? "#4CAF50" : "#2E7D32"} />
            </Animated.View>
            
            <Animated.Text style={[styles.loadingText, dynamicStyles.loadingText]}>
              AutoParking Control
            </Animated.Text>
            
            <Animated.Text style={[styles.loadingSubtitle, dynamicStyles.subtitleText]}>
              {initProgress}
            </Animated.Text>

            {/* Indicador de modo offline */}
            {isOfflineMode && (
              <View style={styles.offlineIndicator}>
                <Text style={styles.offlineText}>📶 Modo Offline</Text>
              </View>
            )}
            
            <View style={styles.loadingBar}>
              <View style={[styles.loadingBarFill, isOfflineMode && { backgroundColor: '#4CAF50' }]} />
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [appState, setAppState] = useState<AppState>('loading');
  const [initProgress, setInitProgress] = useState('Iniciando sistema...');
  const [initError, setInitError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string; name: string; role: string } | null>(null);
  const [currentAdminScreen, setCurrentAdminScreen] = useState<AdminScreenType>('main');
  
  // ⬇️ ANIMACIÓN PARA TRANSICIONES
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // ⬇️ INICIALIZACIÓN MEJORADA PARA SUPABASE + OFFLINE + REALTIME
  const initializeDatabase = async () => {
    try {
      setAppState('loading');
      setInitError(null);
      setIsOfflineMode(false);
      setInitProgress('Conectando a Supabase...');
      
      console.time('⏱️ Inicialización total de la app');
      
      console.log('🧪 Probando conexión directa a Supabase...');
      try {
        const { supabase } = await import('./android/app/src/utils/supabase');
        const { data, error } = await supabase.from('app_settings').select('key').limit(1);
        
        if (error) {
          console.warn('⚠️ Error en prueba directa:', error);
        } else {
          console.log('✅ Prueba directa de Supabase exitosa:', data);
        }
      } catch (testError) {
        console.warn('⚠️ Prueba directa falló:', testError);
      }
      
      // Verificar estado de conectividad
      const isOnline = databaseService.isConnected();
      setIsOfflineMode(!isOnline);
      
      if (isOnline) {
        setInitProgress('Conectado a la nube ✓');
        console.log('🌐 Modo Online - Supabase conectado');
      } else {
        setInitProgress('Trabajando sin conexión ✓');
        console.log('📱 Modo Offline - Usando cache local');
      }
      
      // Pequeña pausa para mostrar el mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.timeEnd('⏱️ Inicialización total de la app');
      setAppState('ready');
      
    } catch (error) {
      console.error('❌ Error inicializando la aplicación:', error);
      
      // Intentar modo offline como fallback
      try {
        console.log('🔄 Intentando modo offline...');
        setInitProgress('Activando modo offline...');
        setIsOfflineMode(true);
        
        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📱 Modo offline activado');
        setAppState('ready');
        
      } catch (offlineError) {
        console.error('❌ Error en modo offline:', offlineError);
        setInitError(
          error instanceof Error 
            ? `Conexión fallida: ${error.message}` 
            : 'Error desconocido al conectar con Supabase'
        );
        setAppState('error');
      }
    }
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  // ⬇️ FUNCIÓN PARA REINTENTAR INICIALIZACIÓN
  const handleRetry = () => {
    console.log('🔄 Reintentando conexión a Supabase...');
    initializeDatabase();
  };

  // ⬇️ FUNCIONES CON ANIMACIONES DE TRANSICIÓN (sin cambios)
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

  // ⬇️ MOSTRAR PANTALLA DE LOADING O ERROR
  if (appState !== 'ready') {
    return (
      <LoadingScreen 
        isDarkMode={isDarkMode} 
        initProgress={initProgress}
        error={initError}
        onRetry={handleRetry}
        isOfflineMode={isOfflineMode}
      />
    );
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
      // content = <OperatorScreen onLogout={handleLogout} />;
      content = (
      <OperatorScreen 
        onLogout={handleLogout} 
        currentUser={user} // ✅ PASAR información del usuario
      />
    );
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
      
      {/* Indicador de conectividad en la app */}
      {isOfflineMode && appState === 'ready' && (
        <View style={styles.connectivityBanner}>
          <Text style={styles.connectivityText}>
            📱 Trabajando sin conexión - Los datos se sincronizarán automáticamente
          </Text>
        </View>
      )}
      
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
  // ⬇️ ESTILOS PARA ESTADOS DE ERROR
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // ⬇️ NUEVOS ESTILOS PARA CONECTIVIDAD
  offlineIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  offlineText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  connectivityBanner: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectivityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});