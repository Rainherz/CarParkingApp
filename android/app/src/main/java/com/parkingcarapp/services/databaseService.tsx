import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// CONFIGURACIÓN DE SUPABASE
// ========================================
const supabaseUrl = 'https://gpxzykdevxgoqcrbcobg.supabase.co'; // ← CAMBIAR POR TU URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweHp5a2Rldnhnb3FjcmJjb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTM2NDgsImV4cCI6MjA2NzgyOTY0OH0.JLz9z8i6YXMfnEKk6AM3VLi32uM35sIDqm6CQYdxACw'; // ← CAMBIAR POR TU KEY

// ========================================
// INTERFACES (mantienen compatibilidad con código existente)
// ========================================
interface VehicleEntry {
  id?: number;
  plateNumber: string;
  entryTime: string;
  exitTime?: string;
  duration?: number; // en minutos
  amount?: number;
  status: 'parked' | 'exited';
  confidence?: number; // confianza del OCR
  createdAt?: string;
}

interface DailySummary {
  totalVehicles: number;
  vehiclesParked: number;
  totalEarnings: number;
  averageStay: number; // en minutos
}

// ========================================
// SERVICIO DE BASE DE DATOS CON SUPABASE + OFFLINE + REALTIME
// ========================================
class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private isOnline: boolean = true;
  private realtimeChannels: RealtimeChannel[] = [];
  private offlineQueue: any[] = [];
  
  // Cache offline para operación sin internet
  private cache = {
    activeVehicles: [] as VehicleEntry[],
    settings: {} as Record<string, string>,
    operators: [] as any[],
    lastSync: null as Date | null,
  };

  constructor() {
    // Inicializar cliente de Supabase
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.setupNetworkListener();
  }

  // ========================================
  // INICIALIZACIÓN (reemplaza el SQLite init)
  // ========================================
  public async initDatabase() {
    try {
      console.log('🔄 Conectando a Supabase...');
      
      if (!this.supabase) {
        throw new Error('Cliente de Supabase no inicializado');
      }

      // Probar conexión
      await this.testConnection();
      console.log('✅ Conexión a Supabase exitosa');

      // Cargar cache offline
      await this.loadOfflineCache();
      console.log('✅ Cache offline cargado');

      // Configurar realtime
      await this.setupRealtimeSubscriptions();
      console.log('✅ Subscripciones realtime configuradas');

      // Sincronizar datos si estamos online
      if (this.isOnline) {
        await this.syncOfflineQueue();
        await this.refreshCache();
        console.log('✅ Sincronización inicial completada');
      }

      console.log('✅ DatabaseService inicializado con Supabase');
    } catch (error) {
      console.error('❌ Error inicializando DatabaseService:', error);
      // En modo offline, continuar con cache local
      console.log('⚠️ Continuando en modo offline');
    }
  }

  // ========================================
  // FUNCIONES DE CONECTIVIDAD Y CACHE
  // ========================================
  private async testConnection(): Promise<void> {
    const { data, error } = await this.supabase!
      .from('app_settings')
      .select('key')
      .limit(1);
    
    if (error) throw error;
    this.isOnline = true;
  }

  private setupNetworkListener() {
    // En React Native, podrías usar @react-native-community/netinfo
    // Por ahora, asumimos conexión disponible
    this.isOnline = true;
  }

  private async loadOfflineCache() {
    try {
      const cached = await AsyncStorage.getItem('parking_cache');
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando cache offline:', error);
    }
  }

  private async saveOfflineCache() {
    try {
      await AsyncStorage.setItem('parking_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('⚠️ Error guardando cache offline:', error);
    }
  }

  // ========================================
  // REALTIME SUBSCRIPTIONS
  // ========================================
  private async setupRealtimeSubscriptions() {
    if (!this.supabase || !this.isOnline) return;

    // Suscribirse a cambios en vehicle_entries
    const vehicleChannel = this.supabase
      .channel('vehicle_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_entries',
        },
        (payload) => this.handleVehicleChange(payload)
      )
      .subscribe();

    // Suscribirse a cambios en app_settings
    const settingsChannel = this.supabase
      .channel('settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => this.handleSettingsChange(payload)
      )
      .subscribe();

    this.realtimeChannels = [vehicleChannel, settingsChannel];
  }

  private handleVehicleChange(payload: any) {
    console.log('🔄 Cambio realtime en vehículos:', payload);
    // Actualizar cache local
    this.refreshActiveVehiclesCache();
  }

  private handleSettingsChange(payload: any) {
    console.log('🔄 Cambio realtime en configuraciones:', payload);
    // Actualizar cache de configuraciones
    this.refreshSettingsCache();
  }

  // ========================================
  // OPERACIONES OFFLINE
  // ========================================
  private async addToOfflineQueue(operation: any) {
    this.offlineQueue.push({
      ...operation,
      timestamp: new Date().toISOString(),
    });
    
    // Intentar sincronizar inmediatamente si estamos online
    if (this.isOnline) {
      await this.syncOfflineQueue();
    }
  }

  private async syncOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    console.log(`🔄 Sincronizando ${this.offlineQueue.length} operaciones offline...`);
    
    for (const operation of this.offlineQueue) {
      try {
        await this.executeOfflineOperation(operation);
      } catch (error) {
        console.error('❌ Error sincronizando operación:', operation, error);
      }
    }
    
    this.offlineQueue = [];
    console.log('✅ Cola offline sincronizada');
  }

  private async executeOfflineOperation(operation: any) {
    switch (operation.type) {
      case 'registerEntry':
        await this.registerEntry(operation.plateNumber, operation.operatorId, operation.confidence);
        break;
      case 'processExit':
        await this.processExit(operation.plateNumber);
        break;
      case 'setSetting':
        await this.setSetting(operation.key, operation.value);
        break;
      // Agregar más operaciones según sea necesario
    }
  }

  // ========================================
  // FUNCIONES PRINCIPALES (API compatible con SQLite)
  // ========================================

  // Registrar entrada de vehículo
  async registerEntry(
    plateNumber: string,
    operatorId?: number,
    confidence?: number,
  ): Promise<number> {
    try {
      if (!this.isOnline) {
        // Modo offline: agregar a cola
        await this.addToOfflineQueue({
          type: 'registerEntry',
          plateNumber,
          operatorId,
          confidence,
        });
        
        // Simular ID local para respuesta inmediata
        return Date.now();
      }

      const entryTime = new Date().toISOString();
      const { data, error } = await this.supabase!
        .from('vehicle_entries')
        .insert([
          {
            plate_number: plateNumber,
            entry_time: entryTime,
            status: 'parked',
            confidence: confidence || 0,
            operator_id: operatorId || null,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      console.log('✅ Vehículo registrado:', plateNumber);
      await this.refreshActiveVehiclesCache();
      return data.id;
    } catch (error) {
      console.error('❌ Error registrando entrada:', error);
      throw new Error('No se pudo registrar la entrada del vehículo');
    }
  }

  // Procesar salida de vehículo
  async processExit(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      if (!this.isOnline) {
        // En modo offline, usar cache local
        await this.addToOfflineQueue({
          type: 'processExit',
          plateNumber,
        });
        return null; // No podemos procesar offline sin conexión
      }

      const vehicle = await this.getActiveVehicle(plateNumber);
      if (!vehicle) {
        throw new Error('Vehículo no encontrado o ya procesado');
      }

      const exitTime = new Date().toISOString();
      const entryDate = new Date(vehicle.entryTime);
      const exitDate = new Date(exitTime);
      const duration = Math.ceil(
        (exitDate.getTime() - entryDate.getTime()) / (1000 * 60),
      );

      // Obtener tarifa
      const hourlyRate = parseFloat(await this.getSetting('tariff_first_hour')) || 5.0;
      const additionalRate = parseFloat(await this.getSetting('tariff_additional_hour')) || 3.0;
      
      let amount = hourlyRate;
      if (duration > 60) {
        const additionalHours = Math.ceil((duration - 60) / 60);
        amount += additionalHours * additionalRate;
      }

      const { data, error } = await this.supabase!
        .from('vehicle_entries')
        .update({
          exit_time: exitTime,
          duration: duration,
          amount: amount,
          status: 'exited',
        })
        .eq('id', vehicle.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Salida procesada:', plateNumber, 'Monto:', amount);
      await this.refreshActiveVehiclesCache();

      return {
        id: data.id,
        plateNumber: data.plate_number,
        entryTime: data.entry_time,
        exitTime: data.exit_time,
        duration: data.duration,
        amount: data.amount,
        status: data.status,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('❌ Error procesando salida:', error);
      throw error;
    }
  }

  // Obtener vehículo activo por placa
  async getActiveVehicle(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      if (!this.isOnline) {
        // Buscar en cache offline
        const cached = this.cache.activeVehicles.find(
          v => v.plateNumber === plateNumber && v.status === 'parked'
        );
        return cached || null;
      }

      const { data, error } = await this.supabase!
        .from('vehicle_entries')
        .select('*')
        .eq('plate_number', plateNumber)
        .eq('status', 'parked')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        id: data.id,
        plateNumber: data.plate_number,
        entryTime: data.entry_time,
        exitTime: data.exit_time,
        duration: data.duration,
        amount: data.amount,
        status: data.status,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('❌ Error obteniendo vehículo:', error);
      return null;
    }
  }

  // Obtener todos los vehículos activos
  async getActiveVehicles(): Promise<VehicleEntry[]> {
    try {
      if (!this.isOnline) {
        // Retornar cache offline
        return this.cache.activeVehicles.filter(v => v.status === 'parked');
      }

      const { data, error } = await this.supabase!
        .from('vehicle_entries')
        .select('*')
        .eq('status', 'parked')
        .order('entry_time', { ascending: false });

      if (error) throw error;

      const vehicles = data.map(row => ({
        id: row.id,
        plateNumber: row.plate_number,
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        duration: row.duration,
        amount: row.amount,
        status: row.status,
        confidence: row.confidence,
      }));

      // Actualizar cache
      this.cache.activeVehicles = vehicles;
      await this.saveOfflineCache();

      return vehicles;
    } catch (error) {
      console.error('❌ Error obteniendo vehículos activos:', error);
      return this.cache.activeVehicles.filter(v => v.status === 'parked');
    }
  }

  // Obtener resumen diario
  async getDailySummary(date?: string): Promise<DailySummary> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      if (!this.isOnline) {
        // Calcular desde cache offline (aproximado)
        const cachedVehicles = this.cache.activeVehicles;
        return {
          totalVehicles: cachedVehicles.length,
          vehiclesParked: cachedVehicles.filter(v => v.status === 'parked').length,
          totalEarnings: cachedVehicles.reduce((sum, v) => sum + (v.amount || 0), 0),
          averageStay: 0, // Difícil calcular offline
        };
      }

      const { data, error } = await this.supabase!
        .from('vehicle_entries')
        .select('status, amount, duration')
        .gte('entry_time', `${targetDate}T00:00:00`)
        .lt('entry_time', `${targetDate}T23:59:59`);

      if (error) throw error;

      const summary = data.reduce(
        (acc, row) => {
          acc.totalVehicles++;
          if (row.status === 'parked') acc.vehiclesParked++;
          if (row.amount) acc.totalEarnings += parseFloat(row.amount);
          if (row.duration) {
            acc.totalDuration += row.duration;
            acc.countWithDuration++;
          }
          return acc;
        },
        {
          totalVehicles: 0,
          vehiclesParked: 0,
          totalEarnings: 0,
          totalDuration: 0,
          countWithDuration: 0,
        }
      );

      return {
        totalVehicles: summary.totalVehicles,
        vehiclesParked: summary.vehiclesParked,
        totalEarnings: summary.totalEarnings,
        averageStay: summary.countWithDuration > 0 
          ? summary.totalDuration / summary.countWithDuration 
          : 0,
      };
    } catch (error) {
      console.error('❌ Error obteniendo resumen diario:', error);
      return {
        totalVehicles: 0,
        vehiclesParked: 0,
        totalEarnings: 0,
        averageStay: 0,
      };
    }
  }

  // Obtener configuración
  async getSetting(key: string): Promise<string> {
    try {
      if (!this.isOnline && this.cache.settings[key]) {
        return this.cache.settings[key];
      }

      const { data, error } = await this.supabase!
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const value = data?.value || '';
      
      // Actualizar cache
      this.cache.settings[key] = value;
      await this.saveOfflineCache();
      
      return value;
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return this.cache.settings[key] || '';
    }
  }

  // Guardar configuración
  async setSetting(key: string, value: string): Promise<void> {
    try {
      if (!this.isOnline) {
        // Modo offline: agregar a cola
        await this.addToOfflineQueue({
          type: 'setSetting',
          key,
          value,
        });
        
        // Actualizar cache local
        this.cache.settings[key] = value;
        await this.saveOfflineCache();
        return;
      }

      const { error } = await this.supabase!
        .from('app_settings')
        .upsert([
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      // Actualizar cache
      this.cache.settings[key] = value;
      await this.saveOfflineCache();
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw error;
    }
  }

  // Obtener usuario (para login)
  async getUser(username: string, password: string) {
    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('username, name, role')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Error en getUser:', error);
      return null;
    }
  }

  // ========================================
  // FUNCIONES DE ADMINISTRACIÓN
  // ========================================

  async getReports({ operatorId = 'all', startDate = '', endDate = '' } = {}) {
    try {
      let query = this.supabase!
        .from('vehicle_entries')
        .select(`
          *,
          users(name)
        `)
        .order('entry_time', { ascending: false });

      if (operatorId !== 'all') {
        query = query.eq('operator_id', operatorId);
      }
      if (startDate) {
        query = query.gte('entry_time', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('entry_time', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(row => ({
        id: row.id,
        plateNumber: row.plate_number,
        operatorName: row.users?.name || 'Sistema',
        entryTime: new Date(row.entry_time).toLocaleString('es-PE'),
        exitTime: row.exit_time 
          ? new Date(row.exit_time).toLocaleString('es-PE') 
          : null,
        duration: row.duration 
          ? `${Math.floor(row.duration / 60)}h ${row.duration % 60}m` 
          : null,
        amount: row.amount || 0,
        status: row.status === 'exited' ? 'completed' : 'active',
      }));
    } catch (error) {
      console.error('❌ Error obteniendo reportes:', error);
      return [];
    }
  }

  async getOperators() {
    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('role', 'operador')
        .order('name');

      if (error) throw error;

      // Obtener estadísticas de cada operador
      const operators = await Promise.all(
        data.map(async (user) => {
          const { data: stats } = await this.supabase!
            .from('vehicle_entries')
            .select('amount')
            .eq('operator_id', user.id)
            .eq('status', 'exited');

          const totalVehicles = stats?.length || 0;
          const totalEarnings = stats?.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0) || 0;

          return {
            id: user.id.toString(),
            username: user.username,
            name: user.name,
            email: user.email || '',
            phone: user.phone || '',
            isActive: Boolean(user.is_active),
            totalVehiclesProcessed: totalVehicles,
            totalEarnings: totalEarnings,
            lastLogin: null,
          };
        })
      );

      return operators;
    } catch (error) {
      console.error('❌ Error obteniendo operadores:', error);
      return [];
    }
  }

  async addOperator(operator: any) {
    try {
      const { error } = await this.supabase!
        .from('users')
        .insert([
          {
            username: operator.username,
            password: operator.password || 'operador123',
            name: operator.name,
            role: 'operador',
            email: operator.email || '',
            phone: operator.phone || '',
            is_active: 1,
          },
        ]);

      if (error) throw error;
      console.log('✅ Operador agregado:', operator.name);
    } catch (error) {
      console.error('❌ Error agregando operador:', error);
      throw error;
    }
  }

  async updateOperator(operator: any) {
    try {
      const { error } = await this.supabase!
        .from('users')
        .update({
          name: operator.name,
          username: operator.username,
          email: operator.email || '',
          phone: operator.phone || '',
        })
        .eq('id', operator.id);

      if (error) throw error;
      console.log('✅ Operador actualizado:', operator.name);
    } catch (error) {
      console.error('❌ Error actualizando operador:', error);
      throw error;
    }
  }

  async setOperatorStatus(operatorId: string, isActive: boolean) {
    try {
      const { error } = await this.supabase!
        .from('users')
        .update({ is_active: isActive ? 1 : 0 })
        .eq('id', operatorId);

      if (error) throw error;
      console.log(`✅ Estado del operador ${operatorId} cambiado a:`, isActive);
    } catch (error) {
      console.error('❌ Error cambiando estado del operador:', error);
      throw error;
    }
  }

  // Funciones de configuraciones múltiples
  async getSettings(keys: string[]): Promise<Record<string, string>> {
    try {
      const { data, error } = await this.supabase!
        .from('app_settings')
        .select('key, value')
        .in('key', keys);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data.forEach(row => {
        settings[row.key] = row.value;
      });

      return settings;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones:', error);
      return {};
    }
  }

  async saveSettings(settings: Record<string, string>): Promise<void> {
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase!
        .from('app_settings')
        .upsert(settingsArray);

      if (error) throw error;

      // Actualizar cache
      Object.assign(this.cache.settings, settings);
      await this.saveOfflineCache();

      console.log('✅ Configuraciones guardadas:', Object.keys(settings));
    } catch (error) {
      console.error('❌ Error guardando configuraciones:', error);
      throw error;
    }
  }

  async getAllSettings(): Promise<{
    tariffs: any;
    businessInfo: any;
    systemConfig: any;
  }> {
    try {
      const { data, error } = await this.supabase!
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const settings: Record<string, string> = {};
      data.forEach(row => {
        settings[row.key] = row.value;
      });

      // Actualizar cache
      this.cache.settings = settings;
      await this.saveOfflineCache();

      return {
        tariffs: {
          firstHour: parseFloat(settings.tariff_first_hour || '5.00'),
          additionalHour: parseFloat(settings.tariff_additional_hour || '3.00'),
          maxDailyRate: parseFloat(settings.tariff_max_daily || '25.00'),
          nightRate: parseFloat(settings.tariff_night_rate || '2.00'),
          weekendMultiplier: parseFloat(settings.tariff_weekend_multiplier || '1.2'),
        },
        businessInfo: {
          name: settings.business_name || 'AutoParking Control',
          address: settings.business_address || 'Av. Principal 123, Arequipa',
          phone: settings.business_phone || '054-123456',
          email: settings.business_email || 'info@autoparking.com',
          ruc: settings.business_ruc || '20123456789',
          maxSpots: parseInt(settings.business_max_spots || '50'),
        },
        systemConfig: {
          autoBackup: settings.system_auto_backup === 'true',
          printTickets: settings.system_print_tickets === 'true',
          useOCR: settings.system_use_ocr === 'true',
          soundAlerts: settings.system_sound_alerts === 'true',
          maxLoginAttempts: parseInt(settings.system_max_login_attempts || '3'),
          sessionTimeout: parseInt(settings.system_session_timeout || '30'),
          language: settings.system_language || 'es',
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo todas las configuraciones:', error);
      
      // Fallback a valores por defecto
      return {
        tariffs: { firstHour: 5.00, additionalHour: 3.00, maxDailyRate: 25.00, nightRate: 2.00, weekendMultiplier: 1.2 },
        businessInfo: { name: 'AutoParking Control', address: 'Av. Principal 123, Arequipa', phone: '054-123456', email: 'info@autoparking.com', ruc: '20123456789', maxSpots: 50 },
        systemConfig: { autoBackup: true, printTickets: true, useOCR: true, soundAlerts: true, maxLoginAttempts: 3, sessionTimeout: 30, language: 'es' }
      };
    }
  }

  // ========================================
  // FUNCIONES DE CACHE Y SINCRONIZACIÓN
  // ========================================
  
  private async refreshCache() {
    await Promise.all([
      this.refreshActiveVehiclesCache(),
      this.refreshSettingsCache(),
    ]);
  }

  private async refreshActiveVehiclesCache() {
    try {
      const vehicles = await this.getActiveVehicles();
      this.cache.activeVehicles = vehicles;
      await this.saveOfflineCache();
    } catch (error) {
      console.warn('⚠️ Error refrescando cache de vehículos:', error);
    }
  }

  private async refreshSettingsCache() {
    try {
      const { data, error } = await this.supabase!
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const settings: Record<string, string> = {};
      data.forEach(row => {
        settings[row.key] = row.value;
      });

      this.cache.settings = settings;
      await this.saveOfflineCache();
    } catch (error) {
      console.warn('⚠️ Error refrescando cache de configuraciones:', error);
    }
  }

  // ========================================
  // LIMPIEZA Y CONEXIÓN
  // ========================================
  
  async closeDatabase(): Promise<void> {
    try {
      // Cerrar subscripciones realtime
      this.realtimeChannels.forEach(channel => {
        this.supabase?.removeChannel(channel);
      });
      this.realtimeChannels = [];

      // Sincronizar cola offline antes de cerrar
      await this.syncOfflineQueue();

      console.log('✅ DatabaseService cerrado correctamente');
    } catch (error) {
      console.error('❌ Error cerrando DatabaseService:', error);
    }
  }

  // Función de utilidad para comprobar conectividad
  public isConnected(): boolean {
    return this.isOnline;
  }

  // Función para forzar sincronización
  public async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncOfflineQueue();
      await this.refreshCache();
    }
  }
}

export const databaseService = new DatabaseService();