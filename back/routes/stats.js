/**
 * Rutas para endpoints de estadísticas
 */
import express from 'express';
import { getMonthlyStats } from '../controllers/sessionsController.js';

const router = express.Router();

/**
 * POST /api/stats/monthly
 * Obtiene estadísticas mensuales generales del centro
 */
router.post('/monthly', getMonthlyStats);

export default router;

