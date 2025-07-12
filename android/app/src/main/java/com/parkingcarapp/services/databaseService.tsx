import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../../utils/supabase';

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
  operatorId?: number; // ✅ Agregar operatorId
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
  private supabaseClient: SupabaseClient = supabase; // ✅ USAR INSTANCIA ÚNICA
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
    this.setupNetworkListener();
  }

  // ========================================
  // INICIALIZACIÓN (reemplaza el SQLite init)
  // ========================================
  public async initDatabase() {
    try {
      console.log('🔄 Conectando a Supabase...');
      
      if (!this.supabaseClient) {
        throw new Error('Cliente de Supabase no disponible');
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
  const { data, error } = await this.supabaseClient 
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
    if (!this.supabaseClient  || !this.isOnline) return;

    // Suscribirse a cambios en vehicle_entries
    const vehicleChannel = this.supabaseClient 
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
    const settingsChannel = this.supabaseClient 
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
  operatorId?: number, // ✅ Hacer este parámetro requerido en la práctica
  confidence?: number,
): Promise<number> {
  try {
    // ✅ VALIDAR que se proporcione operatorId
    if (!operatorId) {
      console.warn('⚠️ Se intenta registrar vehículo sin operator_id');
      // En modo offline, usar un ID temporal hasta que se sincronice
      operatorId = -1; // ID temporal que se actualizará en sincronización
    }

    console.log(`🚗 Registrando vehículo ${plateNumber} por operador ${operatorId}`);

    // Verificar que Supabase esté disponible
    if (!this.supabaseClient) {
      console.warn('⚠️ Supabase no disponible, registrando offline con operador');
      
      await this.addToOfflineQueue({
        type: 'registerEntry',
        plateNumber,
        operatorId, // ✅ Incluir operatorId en cola offline
        confidence,
      });
      
      const localEntry: VehicleEntry = {
        id: Date.now(),
        plateNumber,
        entryTime: new Date().toISOString(),
        status: 'parked',
        confidence: confidence || 0,
        operatorId, // ✅ Guardar operatorId en cache local
      };
      
      this.cache.activeVehicles.push(localEntry);
      await this.saveOfflineCache();
      
      console.log(`✅ Vehículo registrado offline por operador ${operatorId}:`, plateNumber);
      return localEntry.id!;
    }

    if (!this.isOnline) {
      await this.addToOfflineQueue({
        type: 'registerEntry',
        plateNumber,
        operatorId, // ✅ Incluir operatorId
        confidence,
      });
      
      const localEntry: VehicleEntry = {
        id: Date.now(),
        plateNumber,
        entryTime: new Date().toISOString(),
        status: 'parked',
        confidence: confidence || 0,
        operatorId, // ✅ Guardar operatorId
      };
      
      this.cache.activeVehicles.push(localEntry);
      await this.saveOfflineCache();
      
      console.log(`✅ Vehículo registrado offline por operador ${operatorId}:`, plateNumber);
      return localEntry.id!;
    }

    const entryTime = new Date().toISOString();
    const { data, error } = await this.supabaseClient
      .from('vehicle_entries')
      .insert([
        {
          plate_number: plateNumber,
          entry_time: entryTime,
          status: 'parked',
          confidence: confidence || 0,
          operator_id: operatorId, // ✅ SIEMPRE incluir operator_id
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('⚠️ Error en Supabase registerEntry, registrando offline:', error);
      
      await this.addToOfflineQueue({
        type: 'registerEntry',
        plateNumber,
        operatorId, // ✅ Incluir en fallback
        confidence,
      });
      
      const localEntry: VehicleEntry = {
        id: Date.now(),
        plateNumber,
        entryTime,
        status: 'parked',
        confidence: confidence || 0,
        operatorId, // ✅ Incluir en fallback
      };
      
      this.cache.activeVehicles.push(localEntry);
      await this.saveOfflineCache();
      
      console.log(`✅ Vehículo registrado offline (fallback) por operador ${operatorId}:`, plateNumber);
      return localEntry.id!;
    }

    console.log(`✅ Vehículo registrado online por operador ${operatorId}:`, plateNumber);
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
        console.warn('⚠️ Supabase no inicializado, no se puede procesar salida online');
        
        await this.addToOfflineQueue({
          type: 'processExit',
          plateNumber,
        });
        return null; // No podemos procesar offline sin conexión
      }

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

      const { data, error } = await this.supabaseClient !
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
    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient ) {
      console.warn('⚠️ Supabase no inicializado en getActiveVehicle, buscando en cache');
      
      // Buscar en cache offline
      const cached = this.cache.activeVehicles.find(
        v => v.plateNumber === plateNumber && v.status === 'parked'
      );
      return cached || null;
    }

    if (!this.isOnline) {
      // Buscar en cache offline
      const cached = this.cache.activeVehicles.find(
        v => v.plateNumber === plateNumber && v.status === 'parked'
      );
      return cached || null;
    }

    const { data, error } = await this.supabaseClient 
      .from('vehicle_entries')
      .select('*')
      .eq('plate_number', plateNumber)
      .eq('status', 'parked')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('⚠️ Error en Supabase getActiveVehicle, buscando en cache:', error);
      const cached = this.cache.activeVehicles.find(
        v => v.plateNumber === plateNumber && v.status === 'parked'
      );
      return cached || null;
    }
    
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
    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient ) {
      console.warn('⚠️ Supabase no inicializado en getActiveVehicles, usando cache/datos simulados');
      
      // Retornar datos simulados si no hay cache
      if (this.cache.activeVehicles.length === 0) {
        return []; // Retornar array vacío por defecto
      }
      return this.cache.activeVehicles.filter(v => v.status === 'parked');
    }

    if (!this.isOnline) {
      // Retornar cache offline
      return this.cache.activeVehicles.filter(v => v.status === 'parked');
    }

    const { data, error } = await this.supabaseClient 
      .from('vehicle_entries')
      .select('*')
      .eq('status', 'parked')
      .order('entry_time', { ascending: false });

    if (error) {
      console.warn('⚠️ Error en Supabase getActiveVehicles, usando cache:', error);
      return this.cache.activeVehicles.filter(v => v.status === 'parked');
    }

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

    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient ) {
      console.warn('⚠️ Supabase no inicializado en getDailySummary, usando datos por defecto');
      
      // Calcular desde cache si está disponible
      const cachedVehicles = this.cache.activeVehicles;
      return {
        totalVehicles: cachedVehicles.length,
        vehiclesParked: cachedVehicles.filter(v => v.status === 'parked').length,
        totalEarnings: cachedVehicles.reduce((sum, v) => sum + (v.amount || 0), 0),
        averageStay: 0, // Difícil calcular offline
      };
    }

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

    const { data, error } = await this.supabaseClient 
      .from('vehicle_entries')
      .select('status, amount, duration')
      .gte('entry_time', `${targetDate}T00:00:00`)
      .lt('entry_time', `${targetDate}T23:59:59`);

    if (error) {
      console.warn('⚠️ Error en Supabase getDailySummary, usando datos por defecto:', error);
      return {
        totalVehicles: 0,
        vehiclesParked: 0,
        totalEarnings: 0,
        averageStay: 0,
      };
    }

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

      const { data, error } = await this.supabaseClient !
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

      const { error } = await this.supabaseClient !
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
    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient ) {
      console.warn('⚠️ Supabase no inicializado, verificando usuarios locales...');
      
      // Fallback a usuarios por defecto si no hay conexión
      const defaultUsers = [
        { id: 1, username: 'admin', password: 'admin123', name: 'Administrador del Sistema', role: 'admin' },
        { id: 2, username: 'operador', password: 'operador123', name: 'Operador Principal', role: 'operador' }
      ];
      
      const user = defaultUsers.find(u => u.username === username && u.password === password);
      return user || null;
    }

    const { data, error } = await this.supabaseClient 
      .from('users')
      .select('id, username, name, role')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('⚠️ Error en Supabase, usando usuarios por defecto:', error);
      
      // Fallback a usuarios por defecto
      const defaultUsers = [
        { id: 1, username: 'admin', password: 'admin123', name: 'Administrador del Sistema', role: 'admin' },
        { id: 2, username: 'operador', password: 'operador123', name: 'Operador Principal', role: 'operador' }
      ];
      
      const user = defaultUsers.find(u => u.username === username && u.password === password);
      return user || null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error en getUser:', error);
    
    // Fallback final a usuarios por defecto
    const defaultUsers = [
        { id: 1, username: 'admin', password: 'admin123', name: 'Administrador del Sistema', role: 'admin' },
        { id: 2, username: 'operador', password: 'operador123', name: 'Operador Principal', role: 'operador' }
      ];
    
    const user = defaultUsers.find(u => u.username === username && u.password === password);
    return user || null;
  }
}

  // ========================================
  // FUNCIONES DE ADMINISTRACIÓN
  // ========================================

  // ============================================
// CORREGIR: getReports() con filtro por operador
// ============================================

async getReports({ operatorId = 'all', startDate = '', endDate = '' } = {}) {
  try {
    // Verificar que Supabase esté disponible
    if (!this.supabaseClient) {
      console.warn('⚠️ Supabase no disponible en getReports, retornando datos vacíos');
      return [];
    }

    console.log('🔍 Obteniendo reportes con filtros:', { operatorId, startDate, endDate });

    // ✅ PASO 1: Construir consulta de vehicle_entries con filtros
    let query = this.supabaseClient
      .from('vehicle_entries')
      .select('*')
      .order('entry_time', { ascending: false });

    // ✅ FILTRO POR OPERADOR - Convertir string a número si es necesario
    if (operatorId !== 'all') {
      const operatorIdNumber = parseInt(operatorId, 10);
      if (!isNaN(operatorIdNumber)) {
        query = query.eq('operator_id', operatorIdNumber);
        console.log(`🎯 Filtrando por operador ID: ${operatorIdNumber}`);
      } else {
        console.warn(`⚠️ ID de operador inválido: ${operatorId}`);
        return []; // Retornar vacío si el ID es inválido
      }
    }

    // ✅ FILTROS POR FECHA
    if (startDate) {
      query = query.gte('entry_time', `${startDate}T00:00:00`);
      console.log(`📅 Fecha desde: ${startDate}`);
    }
    if (endDate) {
      query = query.lte('entry_time', `${endDate}T23:59:59`);
      console.log(`📅 Fecha hasta: ${endDate}`);
    }

    // Ejecutar consulta principal
    const { data: vehicleEntries, error: vehicleError } = await query;
    
    if (vehicleError) {
      console.warn('⚠️ Error en Supabase getReports (vehicle_entries):', vehicleError);
      return [];
    }

    if (!vehicleEntries || vehicleEntries.length === 0) {
      console.log('📭 No se encontraron vehículos con los filtros aplicados');
      return [];
    }

    console.log(`✅ Se encontraron ${vehicleEntries.length} registros de vehículos`);

    // ✅ PASO 2: Obtener información de operadores
    let operatorNames: Record<string, string> = {};

    if (operatorId === 'all') {
      // Si mostramos todos, obtener nombres de todos los operadores únicos
      const operatorIds = [...new Set(
        vehicleEntries
          .map(entry => entry.operator_id)
          .filter(id => id !== null && id !== undefined)
      )];

      if (operatorIds.length > 0) {
        try {
          const { data: operators, error: operatorError } = await this.supabaseClient
            .from('users')
            .select('id, name')
            .in('id', operatorIds);

          if (operatorError) {
            console.warn('⚠️ Error obteniendo nombres de operadores:', operatorError);
          } else {
            operatorNames = operators.reduce((acc, op) => {
              acc[op.id] = op.name;
              return acc;
            }, {} as Record<string, string>);
            console.log(`👥 Nombres de operadores obtenidos: ${Object.keys(operatorNames).length}`);
          }
        } catch (operatorFetchError) {
          console.warn('⚠️ Error en consulta de operadores:', operatorFetchError);
        }
      }
    } else {
      // Si filtramos por operador específico, obtener solo ese nombre
      const operatorIdNumber = parseInt(operatorId, 10);
      try {
        const { data: operator, error: operatorError } = await this.supabaseClient
          .from('users')
          .select('id, name')
          .eq('id', operatorIdNumber)
          .single();

        if (operatorError) {
          console.warn('⚠️ Error obteniendo nombre del operador:', operatorError);
        } else if (operator) {
          operatorNames[operator.id] = operator.name;
          console.log(`👤 Operador encontrado: ${operator.name}`);
        }
      } catch (operatorFetchError) {
        console.warn('⚠️ Error en consulta del operador específico:', operatorFetchError);
      }
    }

    // ✅ PASO 3: Mapear y formatear los resultados
    const formattedReports = vehicleEntries.map(row => {
      const operatorName = row.operator_id 
        ? (operatorNames[row.operator_id] || `Operador ${row.operator_id}`)
        : 'Sistema';

      return {
        id: row.id,
        plateNumber: row.plate_number,
        operatorName: operatorName,
        entryTime: new Date(row.entry_time).toLocaleString('es-PE'),
        exitTime: row.exit_time 
          ? new Date(row.exit_time).toLocaleString('es-PE') 
          : null,
        duration: row.duration 
          ? `${Math.floor(row.duration / 60)}h ${row.duration % 60}m` 
          : null,
        amount: row.amount || 0,
        status: row.status === 'exited' ? 'completed' : 'active',
      };
    });

    console.log(`✅ Reportes formateados: ${formattedReports.length} registros`);
    
    // ✅ PASO 4: Log adicional para debug
    if (operatorId !== 'all') {
      const operatorName = Object.values(operatorNames)[0] || `Operador ${operatorId}`;
      console.log(`📊 Vehículos registrados por ${operatorName}: ${formattedReports.length}`);
    }

    return formattedReports;

  } catch (error) {
    console.error('❌ Error obteniendo reportes:', error);
    return [];
  }
}

// ============================================
// FUNCIÓN AUXILIAR: Verificar operadores disponibles
// ============================================

async getAvailableOperatorsForReports() {
  try {
    if (!this.supabaseClient) {
      return [];
    }

    // Obtener operadores que tienen vehículos registrados
    const { data: vehicleEntries } = await this.supabaseClient
      .from('vehicle_entries')
      .select('operator_id')
      .not('operator_id', 'is', null);

    if (!vehicleEntries) return [];

    const operatorIds = [...new Set(vehicleEntries.map(entry => entry.operator_id))];

    if (operatorIds.length === 0) return [];

    const { data: operators } = await this.supabaseClient
      .from('users')
      .select('id, name, username')
      .in('id', operatorIds)
      .eq('role', 'operador')
      .order('name');

    return operators || [];

  } catch (error) {
    console.error('❌ Error obteniendo operadores disponibles:', error);
    return [];
  }
}

  async getOperators() {
  try {
    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient) {
      console.warn('⚠️ Supabase no inicializado en getOperators, retornando operadores por defecto');
      
      // Retornar operadores por defecto
      return [
        {
          id: '1',
          username: 'operador',
          name: 'Operador Principal',
          email: '',
          phone: '',
          isActive: true,
          totalVehiclesProcessed: 0,
          totalEarnings: 0,
          lastLogin: null,
        }
      ];
    }

    const { data, error } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('role', 'operador')
      .order('name');

    if (error) {
      console.warn('⚠️ Error en Supabase getOperators, usando operadores por defecto:', error);
      return [
        {
          id: '1',
          username: 'operador',
          name: 'Operador Principal',
          email: '',
          phone: '',
          isActive: true,
          totalVehiclesProcessed: 0,
          totalEarnings: 0,
          lastLogin: null,
        }
      ];
    }

    // Obtener estadísticas de cada operador
    const operators = await Promise.all(
      data.map(async (user) => {
        let totalVehicles = 0;
        let totalEarnings = 0;

        try {
          const { data: stats } = await this.supabaseClient
            .from('vehicle_entries')
            .select('amount')
            .eq('operator_id', user.id)
            .eq('status', 'exited');

          totalVehicles = stats?.length || 0;
          totalEarnings = stats?.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0) || 0;
        } catch (statsError) {
          console.warn('⚠️ Error obteniendo estadísticas del operador:', statsError);
        }

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
      const { error } = await this.supabaseClient
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
      const { error } = await this.supabaseClient
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
      const { error } = await this.supabaseClient
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
      const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
    // Verificar que Supabase esté inicializado
    if (!this.supabaseClient) {
      console.warn('⚠️ Supabase no inicializado en getAllSettings, usando valores por defecto');
      
      // Retornar valores por defecto
      return {
        tariffs: { firstHour: 5.00, additionalHour: 3.00, maxDailyRate: 25.00, nightRate: 2.00, weekendMultiplier: 1.2 },
        businessInfo: { name: 'AutoParking Control', address: 'Av. Principal 123, Arequipa', phone: '054-123456', email: 'info@autoparking.com', ruc: '20123456789', maxSpots: 50 },
        systemConfig: { autoBackup: true, printTickets: true, useOCR: true, soundAlerts: true, maxLoginAttempts: 3, sessionTimeout: 30, language: 'es' }
      };
    }

    const { data, error } = await this.supabaseClient
      .from('app_settings')
      .select('key, value');

    if (error) {
      console.warn('⚠️ Error en Supabase getAllSettings, usando valores por defecto:', error);
      
      // Retornar valores por defecto
      return {
        tariffs: { firstHour: 5.00, additionalHour: 3.00, maxDailyRate: 25.00, nightRate: 2.00, weekendMultiplier: 1.2 },
        businessInfo: { name: 'AutoParking Control', address: 'Av. Principal 123, Arequipa', phone: '054-123456', email: 'info@autoparking.com', ruc: '20123456789', maxSpots: 50 },
        systemConfig: { autoBackup: true, printTickets: true, useOCR: true, soundAlerts: true, maxLoginAttempts: 3, sessionTimeout: 30, language: 'es' }
      };
    }

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
      const { data, error } = await this.supabaseClient
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
        this.supabaseClient?.removeChannel(channel);
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