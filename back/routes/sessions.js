/**
 * Rutas para endpoints de sesiones terapéuticas
 */
import express from 'express';
import { recordSession, getMonthlyCount, getMonthlyStats } from '../controllers/sessionsController.js';

const router = express.Router();

/**
 * POST /api/sessions/record
 * Registra una nueva sesión terapéutica
 */
router.post('/record', recordSession);

/**
 * POST /api/sessions/monthly-count
 * Obtiene el conteo mensual de sesiones de un beneficiario
 */
router.post('/monthly-count', getMonthlyCount);

/**
 * POST /api/stats/monthly
 * Obtiene estadísticas mensuales del centro (opcional)
 */
router.post('/stats/monthly', getMonthlyStats);

export default router;

