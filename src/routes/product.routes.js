import {Router} from 'express';
import {
    getProducts, getProductById, setProduct, updateProduct, deleteProduct,
} from '../controller/product.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireAtLeastOneBodyField, requireBodyFields} from '../middleware/validation.middleware.js';
import {createUploader} from '../middleware/cloudinary.middleware.js';

const router = Router();
const uploadProductImage = createUploader('marvi/productos');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Listar productos (paginado)
 *     tags: [Productos]
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
 *         description: Lista de productos
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener un producto por su id
 *     tags: [Productos]
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
 *         description: Datos del producto
 *       400:
 *         description: ID de producto inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado'), getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Productos]
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
 *               stock:
 *                 type: number
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto reactivado si ya existía en estado inactivo
 *       201:
 *         description: Producto creado
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
router.post('/', verifyToken, authorize('administrador', 'usuario'), uploadProductImage.single('imagen'), requireBodyFields(['codigo', 'nombre', 'unidad_medida', 'precio']), setProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar datos de un producto
 *     tags: [Productos]
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
 *               stock:
 *                 type: number
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       400:
 *         description: Campos inválidos o ID inválido
 *       409:
 *         description: El campo código está en uso por un registro activo o conflicto con inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario'), uploadProductImage.single('imagen'), requireAtLeastOneBodyField(['codigo', 'nombre', 'descripcion', 'unidad_medida', 'precio', 'stock', 'estado', 'imagen']), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Desactivar un producto (borrado lógico)
 *     tags: [Productos]
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
 *         description: Producto desactivado
 *       400:
 *         description: ID de producto inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deleteProduct);

export default router;

