import {Router} from 'express';
import {getAuditLogById, getAuditLogs, getMyAuditLogs} from '../controller/audit-log.controller.js';
import {authorize, verifyToken} from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Listar audit logs (paginado)
 *     tags: [Bitácoras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: usuarioId
 *         schema:
 *           type: string
 *       - in: query
 *         name: accion
 *         schema:
 *           type: string
 *           enum: [creo, actualizo, borro, modifico]
 *       - in: query
 *         name: entidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Lista de audit logs
 */
router.get('/', verifyToken, authorize('administrador', 'usuario'), getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/me:
 *   get:
 *     summary: Listar mis operaciones en audit log
 *     tags: [Bitácoras]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de audit logs del usuario autenticado
 */
router.get('/me', verifyToken, authorize('administrador', 'usuario', 'invitado', 'cliente'), getMyAuditLogs);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     summary: Obtener un audit log por ID
 *     tags: [Bitácoras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log encontrado
 *       404:
 *         description: Audit log no encontrado
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario'), getAuditLogById);

export default router;

