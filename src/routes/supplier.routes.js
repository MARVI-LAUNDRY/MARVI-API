import {Router} from 'express';
import {
    deleteSupplier, getSupplierById, getSuppliers, setSupplier, updateSupplier,
} from '../controller/supplier.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireAtLeastOneBodyField, requireBodyFields} from '../middleware/validation.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Listar proveedores (paginado)
 *     tags: [Proveedores]
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
 *         description: Búsqueda de texto
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [codigo, nombre, correo, createdAt]
 *           default: nombre
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
 *         description: Lista de proveedores
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getSuppliers);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Obtener un proveedor por su ID
 *     tags: [Proveedores]
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
 *         description: Datos del proveedor
 *       400:
 *         description: ID de proveedor inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado'), getSupplierById);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Crear un nuevo proveedor
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo, nombre]
 *             properties:
 *               codigo:
 *                 type: string
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *     responses:
 *       200:
 *         description: Proveedor reactivado si ya existía en estado inactivo
 *       201:
 *         description: Proveedor creado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: El campo código está en uso por un registro activo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, authorize('administrador', 'usuario'), requireBodyFields(['codigo', 'nombre']), setSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     summary: Actualizar datos de un proveedor
 *     tags: [Proveedores]
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
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *     responses:
 *       200:
 *         description: Proveedor actualizado
 *       400:
 *         description: Campos inválidos o ID inválido
 *       409:
 *         description: El campo código está en uso por un registro activo o coincide con uno inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario'), requireAtLeastOneBodyField(['nombre', 'correo', 'telefono', 'direccion', 'estado']), updateSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Desactivar un proveedor (borrado lógico)
 *     tags: [Proveedores]
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
 *         description: Proveedor desactivado
 *       400:
 *         description: ID de proveedor inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deleteSupplier);

export default router;

