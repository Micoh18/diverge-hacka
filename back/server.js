/**
 * Servidor Express para API de sesiones terapéuticas DIVERGE
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSoroban } from './config/stellar.js';
import { errorHandler, validateEnv } from './utils/errorHandler.js';
import sessionsRoutes from './routes/sessions.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8000';

// Middleware
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware de validación de variables de entorno
app.use(validateEnv);

// Rutas
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'DIVERGE Backend API',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/sessions', sessionsRoutes);

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        service: 'DIVERGE Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            recordSession: 'POST /api/sessions/record',
            getMonthlyCount: 'POST /api/sessions/monthly-count',
            getMonthlyStats: 'POST /api/stats/monthly'
        }
    });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Inicializar conexión a Stellar Soroban
try {
    initSoroban();
} catch (error) {
    console.error('❌ Error al inicializar Soroban:', error);
    process.exit(1);
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     DIVERGE Backend API - Sesiones Terapéuticas          ║
╚═══════════════════════════════════════════════════════════╝
🚀 Servidor iniciado en http://localhost:${PORT}
📡 Soroban RPC: ${process.env.SOROBAN_RPC_URL || 'No configurado'}
📝 Contrato: ${process.env.CONTRACT_ID ? process.env.CONTRACT_ID.substring(0, 20) + '...' : 'No configurado'}
🌐 CORS Origin: ${CORS_ORIGIN}
    `);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

