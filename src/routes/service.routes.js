import {Router} from 'express';
import {
    getServices, getServiceById, setService, updateService, deleteService,
} from '../controller/service.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireAtLeastOneBodyField, requireBodyFields} from '../middleware/validation.middleware.js';
import {createUploader} from '../middleware/cloudinary.middleware.js';

const router = Router();
const uploadServiceImage = createUploader('marvi/servicios');

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Listar servicios (paginado)
 *     tags: [Servicios]
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
 *     responses:
 *       200:
 *         description: Lista de servicios
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Obtener un servicio por su id
 *     tags: [Servicios]
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
 *         description: Datos del servicio
 *       400:
 *         description: ID de servicio inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Servicio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado'), getServiceById);

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Crear un nuevo servicio
 *     tags: [Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [codigo, nombre, unidad_medida, precio]
 *             properties:
 *               codigo:
 *                 type: string
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               unidad_medida:
 *                 type: string
 *               precio:
 *                 type: number
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Servicio reactivado si ya existía en estado inactivo
 *       201:
 *         description: Servicio creado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: El campo código está en uso por un registro activo o conflicto con inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, authorize('administrador', 'usuario'), uploadServiceImage.single('imagen'), requireBodyFields(['codigo', 'nombre', 'unidad_medida', 'precio']), setService);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Actualizar datos de un servicio
 *     tags: [Servicios]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               codigo:
 *                 type: string
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               unidad_medida:
 *                 type: string
 *               precio:
 *                 type: number
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Servicio actualizado
 *       400:
 *         description: Campos inválidos o ID inválido
 *       409:
 *         description: El campo código está en uso por un registro activo o conflicto con inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Servicio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario'), uploadServiceImage.single('imagen'), requireAtLeastOneBodyField(['codigo', 'nombre', 'descripcion', 'unidad_medida', 'precio', 'estado', 'imagen']), updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Desactivar un servicio (borrado lógico)
 *     tags: [Servicios]
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
 *         description: Servicio desactivado
 *       400:
 *         description: ID de servicio inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Servicio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deleteService);

export default router;

