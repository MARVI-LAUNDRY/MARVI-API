import {Router} from 'express';
import {
    getOrders, getOrdersByClient, getOrderById, getOrderByCode, setOrder, updateOrder, updateOrderClient, deleteOrder,
} from '../controller/order.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireBodyFields, requireAtLeastOneBodyField} from '../middleware/validation.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Listar pedidos (paginado)
 *     tags: [Pedidos]
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
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getOrders);

/**
 * @swagger
 * /api/orders/code/{codigo}:
 *   get:
 *     summary: Obtener un pedido por código
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del pedido
 *       400:
 *         description: Código inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/code/:codigo', verifyToken, authorize('cliente'), getOrderByCode);

/**
 * @swagger
 * /api/orders/client/{clienteId}:
 *   get:
 *     summary: Listar pedidos de un cliente (sin paginación)
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por texto en código de pedido
 *     responses:
 *       200:
 *         description: Lista de pedidos del cliente
 *       400:
 *         description: ID de cliente inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/client/:clienteId', verifyToken, authorize('administrador', 'usuario', 'invitado', 'cliente'), getOrdersByClient);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener un pedido por id
 *     tags: [Pedidos]
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
 *         description: Datos del pedido
 *       400:
 *         description: ID de pedido inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado', 'cliente'), getOrderById);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Registrar un nuevo pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo, cliente_id]
 *             properties:
 *               codigo:
 *                 type: string
 *               cliente_id:
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
 *               servicios:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [servicio_id, cantidad]
 *                   properties:
 *                     servicio_id:
 *                       type: string
 *                     cantidad:
 *                       type: number
 *                     precio_unitario:
 *                       type: number
 *     responses:
 *       201:
 *         description: Pedido creado
 *       400:
 *         description: Datos inválidos o inconsistentes (cliente/productos/servicios/stock)
 *       409:
 *         description: El campo código ya está en uso
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, authorize('administrador', 'usuario'), requireBodyFields(['codigo', 'cliente_id']), setOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   patch:
 *     summary: Actualizar el estado de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [creado, listo, completado, cancelado]
 *     responses:
 *       200:
 *         description: Estado del pedido actualizado
 *       400:
 *         description: Estado inválido, campos no permitidos o ID inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id', verifyToken, authorize('administrador', 'usuario'), requireAtLeastOneBodyField(['estado']), updateOrder);

/**
 * @swagger
 * /api/orders/{id}/client:
 *   patch:
 *     summary: Reasignar el cliente de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cliente_id]
 *             properties:
 *               cliente_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente del pedido actualizado
 *       400:
 *         description: Cliente inválido, campos no permitidos o ID inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/client', verifyToken, authorize('cliente'), requireBodyFields(['cliente_id']), updateOrderClient);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Eliminar un pedido y revertir stock de productos
 *     tags: [Pedidos]
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
 *         description: Pedido eliminado
 *       400:
 *         description: ID inválido o no se pudo revertir stock
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deleteOrder);

export default router;

