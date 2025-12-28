/**
 * Configuración de base de datos SQLite para almacenar detalles de sesiones
 * que el contrato inteligente no almacena (notas, duración, etc.)
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta a la base de datos (en el directorio database/)
const dbPath = path.join(__dirname, 'diverge.db');

// Crear conexión a la base de datos
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Crear tabla de sesiones si no existe
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        transaction_hash TEXT NOT NULL UNIQUE,
        therapist_address TEXT NOT NULL,
        beneficiary_name TEXT NOT NULL,
        beneficiary_pin TEXT NOT NULL,
        therapy_type TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_minutes INTEGER,
        notes TEXT,
        yyyymm INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_beneficiary ON sessions(beneficiary_name, beneficiary_pin);
    CREATE INDEX IF NOT EXISTS idx_yyyymm ON sessions(yyyymm);
    CREATE INDEX IF NOT EXISTS idx_transaction_hash ON sessions(transaction_hash);
    CREATE INDEX IF NOT EXISTS idx_therapy_type ON sessions(therapy_type);
    CREATE INDEX IF NOT EXISTS idx_created_at ON sessions(created_at);
`);

console.log('✅ Base de datos SQLite inicializada en:', dbPath);

export default db;
