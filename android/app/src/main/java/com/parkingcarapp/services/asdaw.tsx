import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

// Versión de la base de datos para futuras migraciones
const DATABASE_VERSION = 1;
const DATABASE_NAME = 'parking_control.db';

interface VehicleEntry {
  id?: number;
  plateNumber: string;
  entryTime: string;
  exitTime?: string;
  duration?: number; // en minutos
  amount?: number;
  status: 'parked' | 'exited';
  confidence?: number; // confianza del OCR
  operatorId?: number;
  createdAt?: string;
}

interface DailySummary {
  totalVehicles: number;
  vehiclesParked: number;
  totalEarnings: number;
  averageStay: number; // en minutos
}

interface User {
  id?: number;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'operador';
  isActive: boolean;
  email?: string;
  phone?: string;
  createdAt?: string;
}

interface AppSetting {
  key: string;
  value: string;
  updatedAt?: string;
}

class DatabaseService {
  public db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // No inicializar aquí, se hará desde App.tsx
  }

  /**
   * Inicializar la base de datos SQLite de forma optimizada
   */
  public async initDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('📋 Base de datos ya inicializada');
      return;
    }

    try {
      console.time('🚀 Inicialización completa de BD');
      
      // Abrir base de datos
      console.time('📂 Abrir BD');
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default',
      });
      console.timeEnd('📂 Abrir BD');

      // Verificar y crear esquema
      await this.setupDatabase();
      
      this.isInitialized = true;
      console.timeEnd('🚀 Inicialización completa de BD');
      console.log('✅ Base de datos SQLite inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      throw error;
    }
  }

  /**
   * Configurar el esquema completo de la base de datos
   */
  private async setupDatabase(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    try {
      // Verificar si necesitamos crear las tablas
      const needsSetup = await this.needsDatabaseSetup();
      
      if (needsSetup) {
        console.time('🏗️ Crear esquema completo');
        await this.createCompleteSchema();
        await this.insertInitialData();
        console.timeEnd('🏗️ Crear esquema completo');
      } else {
        console.log('📋 Esquema de BD ya existe');
      }

      // Siempre verificar/actualizar versión
      await this.updateDatabaseVersion();
      
    } catch (error) {
      console.error('❌ Error configurando esquema:', error);
      throw error;
    }
  }

  /**
   * Verificar si necesitamos crear el esquema completo
   */
  private async needsDatabaseSetup(): Promise<boolean> {
    try {
      const [result] = await this.db!.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
      );
      return result.rows.length === 0;
    } catch (error) {
      return true; // Si hay error, asumir que necesitamos setup
    }
  }

  /**
   * Crear esquema completo con todas las tablas y índices
   */
  private async createCompleteSchema(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    // Crear todas las tablas en una sola transacción
    await this.db.transaction(async (tx) => {
      
      // Tabla USERS - Completa desde el inicio
      await tx.executeSql(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'operador')),
          isActive INTEGER DEFAULT 1,
          email TEXT,
          phone TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla VEHICLE_ENTRIES - Completa desde el inicio
      await tx.executeSql(`
        CREATE TABLE IF NOT EXISTS vehicle_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plate_number TEXT NOT NULL,
          entry_time TEXT NOT NULL,
          exit_time TEXT,
          duration INTEGER,
          amount REAL,
          status TEXT CHECK(status IN ('parked', 'exited')) DEFAULT 'parked',
          confidence REAL,
          operator_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      // Tabla APP_SETTINGS - Para configuraciones del sistema
      await tx.executeSql(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla DB_VERSION - Para control de versiones
      await tx.executeSql(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Tablas creadas exitosamente');
    });

    // Crear índices para optimizar consultas
    await this.createIndexes();
  }

  /**
   * Crear todos los índices necesarios
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    console.time('📊 Crear índices');
    
    const indexes = [
      // Índices para vehicle_entries
      'CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle_entries(plate_number)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_status ON vehicle_entries(status)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_entry_time ON vehicle_entries(entry_time)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_operator ON vehicle_entries(operator_id)',
      'CREATE INDEX IF NOT EXISTS idx_vehicle_date ON vehicle_entries(DATE(entry_time))',
      
      // Índices para users
      'CREATE INDEX IF NOT EXISTS idx_user_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_user_active ON users(isActive)',
      'CREATE INDEX IF NOT EXISTS idx_user_role ON users(role)',
      
      // Índices para app_settings
      'CREATE INDEX IF NOT EXISTS idx_settings_key ON app_settings(key)',
    ];

    for (const indexSql of indexes) {
      try {
        await this.db.executeSql(indexSql);
      } catch (error) {
        console.warn('⚠️ Error creando índice:', indexSql, error);
      }
    }
    
    console.timeEnd('📊 Crear índices');
    console.log('✅ Índices creados exitosamente');
  }

  /**
   * Insertar datos iniciales (usuarios y configuraciones por defecto)
   */
  private async insertInitialData(): Promise<void> {
    if (!this.db) return;

    console.time('📥 Insertar datos iniciales');
    
    try {
      await this.db.transaction(async (tx) => {
        // Insertar usuarios por defecto
        await tx.executeSql(`
          INSERT OR IGNORE INTO users (username, password, name, role, isActive) VALUES 
          ('admin', 'admin123', 'Administrador del Sistema', 'admin', 1),
          ('operador', 'operador123', 'Operador Principal', 'operador', 1)
        `);

        // Insertar configuraciones por defecto
        const defaultSettings = [
          // Tarifas
          ['tariff_first_hour', '5.00'],
          ['tariff_additional_hour', '3.00'],
          ['tariff_max_daily', '25.00'],
          ['tariff_night_rate', '2.00'],
          ['tariff_weekend_multiplier', '1.2'],
          
          // Información del negocio
          ['business_name', 'AutoParking Control'],
          ['business_address', 'Av. Principal 123, Arequipa'],
          ['business_phone', '054-123456'],
          ['business_email', 'info@autoparking.com'],
          ['business_ruc', '20123456789'],
          ['business_max_spots', '50'],
          
          // Configuración del sistema
          ['system_auto_backup', 'true'],
          ['system_print_tickets', 'true'],
          ['system_use_ocr', 'true'],
          ['system_sound_alerts', 'true'],
          ['system_max_login_attempts', '3'],
          ['system_session_timeout', '30'],
          ['system_language', 'es'],
          
          // Configuraciones adicionales
          ['grace_period_minutes', '15'],
          ['app_version', '1.0.0'],
          ['last_backup', new Date().toISOString()],
        ];

        for (const [key, value] of defaultSettings) {
          await tx.executeSql(
            'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
            [key, value]
          );
        }
      });

      console.timeEnd('📥 Insertar datos iniciales');
      console.log('✅ Datos iniciales insertados');
      
    } catch (error) {
      console.error('❌ Error insertando datos iniciales:', error);
      throw error;
    }
  }

  /**
   * Actualizar versión de la base de datos
   */
  private async updateDatabaseVersion(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.executeSql(
        'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
        [DATABASE_VERSION]
      );
    } catch (error) {
      console.warn('⚠️ Error actualizando versión de BD:', error);
    }
  }

  /**
   * Registrar entrada de vehículo
   */
  async registerEntry(
    plateNumber: string,
    operatorId?: number,
    confidence?: number,
  ): Promise<number> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const entryTime = new Date().toISOString();
      const results = await this.db.executeSql(
        `INSERT INTO vehicle_entries 
         (plate_number, entry_time, status, confidence, operator_id) 
         VALUES (?, ?, 'parked', ?, ?)`,
        [plateNumber, entryTime, confidence || 0, operatorId || null],
      );
      
      console.log('✅ Vehículo registrado:', plateNumber);
      return results[0].insertId;
    } catch (error) {
      console.error('❌ Error registrando entrada:', error);
      throw new Error('No se pudo registrar la entrada del vehículo');
    }
  }

  /**
   * Procesar salida de vehículo
   */
  async processExit(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      const vehicle = await this.getActiveVehicle(plateNumber);
      if (!vehicle) {
        throw new Error('Vehículo no encontrado o ya procesado');
      }

      const exitTime = new Date().toISOString();
      const entryDate = new Date(vehicle.entryTime);
      const exitDate = new Date(exitTime);
      const duration = Math.ceil(
        (exitDate.getTime() - entryDate.getTime()) / (1000 * 60),
      ); // minutos

      // Calcular tarifa basada en configuraciones
      const firstHourRate = parseFloat(await this.getSetting('tariff_first_hour')) || 5.0;
      const additionalHourRate = parseFloat(await this.getSetting('tariff_additional_hour')) || 3.0;
      
      let amount = firstHourRate;
      if (duration > 60) {
        const additionalHours = Math.ceil((duration - 60) / 60);
        amount += additionalHours * additionalHourRate;
      }

      if (!this.db) throw new Error('Base de datos no inicializada');
      
      await this.db.executeSql(
        `UPDATE vehicle_entries 
         SET exit_time = ?, duration = ?, amount = ?, status = 'exited' 
         WHERE id = ?`,
        [exitTime, duration, amount, vehicle.id],
      );

      console.log('✅ Salida procesada:', plateNumber, 'Monto:', amount);

      return {
        ...vehicle,
        exitTime,
        duration,
        amount,
        status: 'exited'
      };
    } catch (error) {
      console.error('❌ Error procesando salida:', error);
      throw error;
    }
  }

  /**
   * Obtener vehículo activo por placa
   */
  async getActiveVehicle(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const results = await this.db.executeSql(
        `SELECT * FROM vehicle_entries 
         WHERE plate_number = ? AND status = 'parked' 
         ORDER BY entry_time DESC LIMIT 1`,
        [plateNumber],
      );
      
      if (results[0].rows.length === 0) return null;
      
      const row = results[0].rows.item(0);
      return {
        id: row.id,
        plateNumber: row.plate_number,
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        duration: row.duration,
        amount: row.amount,
        status: row.status,
        confidence: row.confidence,
        operatorId: row.operator_id,
      };
    } catch (error) {
      console.error('❌ Error obteniendo vehículo:', error);
      return null;
    }
  }

  /**
   * Obtener todos los vehículos activos
   */
  async getActiveVehicles(): Promise<VehicleEntry[]> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const results = await this.db.executeSql(
        `SELECT * FROM vehicle_entries 
         WHERE status = 'parked' 
         ORDER BY entry_time DESC`,
      );
      
      const vehicles: VehicleEntry[] = [];
      for (let i = 0; i < results[0].rows.length; i++) {
        const row = results[0].rows.item(i);
        vehicles.push({
          id: row.id,
          plateNumber: row.plate_number,
          entryTime: row.entry_time,
          exitTime: row.exit_time,
          duration: row.duration,
          amount: row.amount,
          status: row.status,
          confidence: row.confidence,
          operatorId: row.operator_id,
        });
      }
      return vehicles;
    } catch (error) {
      console.error('❌ Error obteniendo vehículos activos:', error);
      return [];
    }
  }

  /**
   * Obtener resumen diario optimizado
   */
  async getDailySummary(date?: string): Promise<DailySummary> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const results = await this.db.executeSql(
        `SELECT 
           COUNT(*) as total_vehicles,
           SUM(CASE WHEN status = 'parked' THEN 1 ELSE 0 END) as vehicles_parked,
           COALESCE(SUM(CASE WHEN status = 'exited' THEN amount ELSE 0 END), 0) as total_earnings,
           COALESCE(AVG(CASE WHEN status = 'exited' AND duration > 0 THEN duration ELSE NULL END), 0) as average_stay
         FROM vehicle_entries 
         WHERE DATE(entry_time) = ?`,
        [targetDate],
      );
      
      const row = results[0].rows.item(0);
      return {
        totalVehicles: row.total_vehicles || 0,
        vehiclesParked: row.vehicles_parked || 0,
        totalEarnings: row.total_earnings || 0,
        averageStay: row.average_stay || 0,
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

  /**
   * Obtener configuración (optimizado con cache si es necesario)
   */
  async getSetting(key: string): Promise<string> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const results = await this.db.executeSql(
        'SELECT value FROM app_settings WHERE key = ?',
        [key],
      );
      
      if (results[0].rows.length === 0) return '';
      return results[0].rows.item(0).value || '';
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return '';
    }
  }

  /**
   * Guardar configuración
   */
  async setSetting(key: string, value: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      await this.db.executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, new Date().toISOString()],
      );
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario para autenticación
   */
  async getUser(username: string, password: string): Promise<User | null> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const [result] = await this.db.executeSql(
        `SELECT id, username, name, role, isActive, email, phone 
         FROM users 
         WHERE username = ? AND password = ? AND isActive = 1 
         LIMIT 1`,
        [username, password],
      );
      
      if (result.rows.length > 0) {
        const row = result.rows.item(0);
        return {
          id: row.id,
          username: row.username,
          password: row.password ?? '', // Add password to match User interface
          name: row.name,
          role: row.role,
          isActive: Boolean(row.isActive),
          email: row.email,
          phone: row.phone,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error en getUser:', error);
      return null;
    }
  }

  /**
   * Obtener reportes con filtros
   */
  async getReports({ operatorId = 'all', startDate = '', endDate = '' } = {}) {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    let query = `
      SELECT ve.*, u.name as operatorName
      FROM vehicle_entries ve
      LEFT JOIN users u ON ve.operator_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (operatorId !== 'all') {
      query += ' AND ve.operator_id = ?';
      params.push(operatorId);
    }
    if (startDate) {
      query += ' AND DATE(ve.entry_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(ve.entry_time) <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY ve.entry_time DESC';

    const results = await this.db.executeSql(query, params);
    const reports: any[] = [];
    
    for (let i = 0; i < results[0].rows.length; i++) {
      const row = results[0].rows.item(i);
      reports.push({
        id: row.id,
        plateNumber: row.plate_number,
        operatorName: row.operatorName || 'Sistema',
        entryTime: new Date(row.entry_time).toLocaleString('es-PE'),
        exitTime: row.exit_time ? new Date(row.exit_time).toLocaleString('es-PE') : null,
        duration: row.duration ? `${Math.floor(row.duration / 60)}h ${row.duration % 60}m` : null,
        amount: row.amount || 0,
        status: row.status === 'exited' ? 'completed' : 'active',
      });
    }
    return reports;
  }

  /**
   * Obtener operadores
   */
  async getOperators() {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      const [result] = await this.db.executeSql(`
        SELECT 
          u.*,
          COALESCE(stats.totalVehicles, 0) as totalVehiclesProcessed,
          COALESCE(stats.totalEarnings, 0) as totalEarnings
        FROM users u
        LEFT JOIN (
          SELECT 
            operator_id,
            COUNT(*) as totalVehicles,
            SUM(COALESCE(amount, 0)) as totalEarnings
          FROM vehicle_entries 
          WHERE status = 'exited' AND operator_id IS NOT NULL
          GROUP BY operator_id
        ) stats ON u.id = stats.operator_id
        WHERE u.role = 'operador'
        ORDER BY u.name
      `);
      
      const operators: any[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        operators.push({
          id: row.id.toString(),
          username: row.username,
          name: row.name,
          email: row.email || '',
          phone: row.phone || '',
          isActive: Boolean(row.isActive),
          totalVehiclesProcessed: row.totalVehiclesProcessed || 0,
          totalEarnings: parseFloat(row.totalEarnings || '0'),
          lastLogin: null,
        });
      }
      return operators;
    } catch (error: any) {
      console.error('❌ Error obteniendo operadores:', error);
      return [];
    }
  }

  /**
   * Agregar operador
   */
  async addOperator(operator: any) {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      await this.db.executeSql(
        `INSERT INTO users (username, password, name, role, email, phone, isActive) 
         VALUES (?, ?, ?, 'operador', ?, ?, 1)`,
        [
          operator.username, 
          operator.password || 'operador123', 
          operator.name,
          operator.email || '',
          operator.phone || ''
        ]
      );
      console.log('✅ Operador agregado:', operator.name);
    } catch (error) {
      console.error('❌ Error agregando operador:', error);
      throw error;
    }
  }

  /**
   * Actualizar operador
   */
  async updateOperator(operator: any) {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      await this.db.executeSql(
        `UPDATE users 
         SET name = ?, username = ?, email = ?, phone = ? 
         WHERE id = ?`,
        [operator.name, operator.username, operator.email || '', operator.phone || '', operator.id]
      );
      console.log('✅ Operador actualizado:', operator.name);
    } catch (error) {
      console.error('❌ Error actualizando operador:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado del operador
   */
  async setOperatorStatus(operatorId: string, isActive: boolean) {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    try {
      await this.db.executeSql(
        `UPDATE users SET isActive = ? WHERE id = ?`,
        [isActive ? 1 : 0, operatorId]
      );
      console.log(`✅ Estado del operador ${operatorId} cambiado a:`, isActive);
    } catch (error) {
      console.error('❌ Error cambiando estado del operador:', error);
      throw error;
    }
  }

  /**
   * Obtener múltiples configuraciones
   */
  async getSettings(keys: string[]): Promise<Record<string, string>> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const placeholders = keys.map(() => '?').join(',');
      const results = await this.db.executeSql(
        `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`,
        keys
      );
      
      const settings: Record<string, string> = {};
      for (let i = 0; i < results[0].rows.length; i++) {
        const row = results[0].rows.item(i);
        settings[row.key] = row.value;
      }
      
      return settings;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones:', error);
      return {};
    }
  }

  /**
   * Guardar múltiples configuraciones
   */
  async saveSettings(settings: Record<string, string>): Promise<void> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      await this.db.transaction(async (tx) => {
        for (const [key, value] of Object.entries(settings)) {
          await tx.executeSql(
            'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
            [key, value, new Date().toISOString()]
          );
        }
      });
      
      console.log('✅ Configuraciones guardadas:', Object.keys(settings));
    } catch (error) {
      console.error('❌ Error guardando configuraciones:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las configuraciones estructuradas
   */
  async getAllSettings(): Promise<{
    tariffs: any;
    businessInfo: any;
    systemConfig: any;
  }> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const [result] = await this.db.executeSql('SELECT key, value FROM app_settings');
      const settings: Record<string, string> = {};
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        settings[row.key] = row.value;
      }

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
      // Retornar valores por defecto en caso de error
      return {
        tariffs: { firstHour: 5.00, additionalHour: 3.00, maxDailyRate: 25.00, nightRate: 2.00, weekendMultiplier: 1.2 },
        businessInfo: { name: 'AutoParking Control', address: 'Av. Principal 123, Arequipa', phone: '054-123456', email: 'info@autoparking.com', ruc: '20123456789', maxSpots: 50 },
        systemConfig: { autoBackup: true, printTickets: true, useOCR: true, soundAlerts: true, maxLoginAttempts: 3, sessionTimeout: 30, language: 'es' }
      };
    }
  }

  /**
   * Insertar configuraciones por defecto (para restaurar)
   */
  public async insertDefaultSettings(): Promise<void> {
    await this.insertInitialData();
  }

  /**
   * Cerrar conexión de base de datos
   */
  async closeDatabase(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
        this.isInitialized = false;
        console.log('✅ Base de datos cerrada correctamente');
      }
    } catch (error) {
      console.error('❌ Error cerrando base de datos:', error);
    }
  }

  /**
   * Obtener estadísticas de la base de datos
   */
  async getDatabaseStats(): Promise<{
    totalVehicles: number;
    totalUsers: number;
    totalSettings: number;
    databaseSize: string;
  }> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      
      const [vehicleResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM vehicle_entries');
      const [userResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM users');
      const [settingsResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM app_settings');
      
      return {
        totalVehicles: vehicleResult.rows.item(0).count,
        totalUsers: userResult.rows.item(0).count,
        totalSettings: settingsResult.rows.item(0).count,
        databaseSize: 'N/A', // SQLite no expone tamaño fácilmente en React Native
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de BD:', error);
      return {
        totalVehicles: 0,
        totalUsers: 0,
        totalSettings: 0,
        databaseSize: 'Error',
      };
    }
  }
}

export const databaseService = new DatabaseService();