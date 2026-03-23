import {Router} from 'express';
import {
    getDashboardReport, getOverviewReport, getSeriesReport, getTopProductsReport,
} from '../controller/report.controller.js';
import {authorize, verifyToken} from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Obtener datos consolidados del dashboard en una sola respuesta
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: month
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Contadores, serie temporal y top de productos
 */
router.get('/dashboard', verifyToken, authorize('administrador', 'usuario', 'invitado'), getDashboardReport);

/**
 * @swagger
 * /api/reports/overview:
 *   get:
 *     summary: Obtener contadores generales para dashboard
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicial del rango (opcional)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha final del rango (opcional)
 *     responses:
 *       200:
 *         description: Contadores listos para tarjetas de dashboard
 */
router.get('/overview', verifyToken, authorize('administrador', 'usuario', 'invitado'), getOverviewReport);

/**
 * @swagger
 * /api/reports/series:
 *   get:
 *     summary: Obtener series de tiempo para graficos
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: month
 *         description: Tipo de agrupacion temporal
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Zona horaria para la agrupacion
 *     responses:
 *       200:
 *         description: Serie temporal de ingresos, gastos y clientes nuevos
 */
router.get('/series', verifyToken, authorize('administrador', 'usuario', 'invitado'), getSeriesReport);

/**
 * @swagger
 * /api/reports/top-products:
 *   get:
 *     summary: Obtener productos mas vendidos y mas comprados
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Ranking de productos para graficos de barras
 */
router.get('/top-products', verifyToken, authorize('administrador', 'usuario', 'invitado'), getTopProductsReport);

export default router;


