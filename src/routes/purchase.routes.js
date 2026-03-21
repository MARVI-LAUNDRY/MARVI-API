import {Router} from 'express';
import {
    getPurchases, getPurchaseById, setPurchase, updatePurchase, deletePurchase,
} from '../controller/purchase.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireBodyFields, requireAtLeastOneBodyField} from '../middleware/validation.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/purchases:
 *   get:
 *     summary: Listar compras (paginado)
 *     tags: [Compras]
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
 *         description: Búsqueda por texto en código
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [codigo, total, createdAt]
 *           default: codigo
 *         description: Campo por el que se ordena
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Dirección del ordenamiento
 *     responses:
 *       200:
 *         description: Lista de compras
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getPurchases);

/**
 * @swagger
 * /api/purchases/{id}:
 *   get:
 *     summary: Obtener una compra por ID
 *     tags: [Compras]
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
 *         description: Datos de la compra
 *       400:
 *         description: ID de compra inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Compra no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado'), getPurchaseById);

/**
 * @swagger
 * /api/purchases:
 *   post:
 *     summary: Registrar una nueva compra
 *     tags: [Compras]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo, proveedor_id, productos]
 *             properties:
 *               codigo:
 *                 type: string
 *               proveedor_id:
 *                 type: string
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [producto_id, cantidad]
 *                   properties:
 *                     producto_id:
 *                       type: string
 *                     cantidad:
 *                       type: number
 *                     precio_unitario:
 *                       type: number
 *     responses:
 *       201:
 *         description: Compra creada
 *       400:
 *         description: Datos inválidos o inconsistentes (proveedor/productos/stock)
 *       409:
 *         description: El campo código ya está en uso
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, authorize('administrador', 'usuario'), requireBodyFields(['codigo', 'proveedor_id', 'productos']), setPurchase);

/**
 * @swagger
 * /api/purchases/{id}:
 *   put:
 *     summary: Actualizar una compra
 *     tags: [Compras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo:
 *                 type: string
 *               proveedor_id:
 *                 type: string
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [producto_id, cantidad]
 *                   properties:
 *                     producto_id:
 *                       type: string
 *                     cantidad:
 *                       type: number
 *                     precio_unitario:
 *                       type: number
 *     responses:
 *       200:
 *         description: Compra actualizada
 *       400:
 *         description: Datos inválidos, inconsistentes o ID inválido
 *       409:
 *         description: El campo código ya está en uso
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Compra no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario'), requireAtLeastOneBodyField(['codigo', 'proveedor_id', 'productos']), updatePurchase);

/**
 * @swagger
 * /api/purchases/{id}:
 *   delete:
 *     summary: Eliminar una compra y revertir stock
 *     tags: [Compras]
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
 *         description: Compra eliminada
 *       400:
 *         description: ID inválido o no se pudo revertir stock
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Compra no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deletePurchase);

export default router;

