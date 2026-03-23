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
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por usuario, acción, entidad, id/código y ruta
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [usuario_nombre, usuario_rol, accion, entidad, entidad_id, entidad_codigo, createdAt, fecha_registro]
 *           default: createdAt
 *         description: Campo por el que se ordena
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Dirección del ordenamiento
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
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [usuario_nombre, usuario_rol, accion, entidad, entidad_id, entidad_codigo, createdAt, fecha_registro]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
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

