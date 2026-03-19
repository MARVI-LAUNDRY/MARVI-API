import {Router} from 'express';
import {
    getClients, getClientById, setClient, updateClient, updateClientCode, updateClientPassword, deleteClient,
} from '../controller/client.controller.js';
import {
    forgotPasswordClient, loginClient, loginClientGoogle, resetPasswordClient,
} from '../controller/login.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {verifyGoogleIdToken} from '../middleware/google-auth.middleware.js';
import {requireBodyFields, requireAtLeastOneBodyField} from '../middleware/validation.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/clients/login:
 *   post:
 *     summary: Iniciar sesion de cliente con correo y contraseña
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo:
 *                 type: string
 *               contrasena:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inicio de sesion exitoso con token JWT
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', requireBodyFields(['correo', 'contrasena']), loginClient);

/**
 * @swagger
 * /api/clients/login/google:
 *   post:
 *     summary: Iniciar sesion de cliente con Google
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_token]
 *             properties:
 *               id_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inicio de sesion exitoso con token JWT
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: Token de Google inválido
 *       409:
 *         description: El campo correó o código ya está en uso por un registro activo
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login/google', requireBodyFields(['id_token']), verifyGoogleIdToken, loginClientGoogle);

/**
 * @swagger
 * /api/clients/forgot-password/{correo}:
 *   post:
 *     summary: Enviar código de recuperación de contraseña al correo del cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: correo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Código de recuperación enviado al correo
 *       401:
 *         description: Cliente no encontrado o inactivo
 *       500:
 *         description: No se pudo enviar el correo de recuperación o error interno del servidor
 */
router.post('/forgot-password/:correo', forgotPasswordClient);

/**
 * @swagger
 * /api/clients/reset-password/{correo}:
 *   post:
 *     summary: Restablecer contraseña de cliente usando el código de recuperación
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: correo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo, contrasena]
 *             properties:
 *               codigo:
 *                 type: string
 *               contrasena:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       400:
 *         description: Código de recuperación inválido o expirado, o campos faltantes
 *       401:
 *         description: Cliente no encontrado o inactivo
 *       500:
 *         description: Error interno del servidor
 */
router.post('/reset-password/:correo', requireBodyFields(['codigo', 'contrasena']), resetPasswordClient);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Listar clientes (paginado)
 *     tags: [Clientes]
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
 *         description: Lista de clientes
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getClients);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Obtener un cliente por su id
 *     tags: [Clientes]
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
 *         description: Datos del cliente
 *       400:
 *         description: ID de cliente inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado', 'cliente'), getClientById);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clientes]
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
 *               primer_apellido:
 *                 type: string
 *               segundo_apellido:
 *                 type: string
 *               correo:
 *                 type: string
 *               contrasena:
 *                 type: string
 *               telefono:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen_perfil:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Cliente reactivado si ya existía en estado inactivo
 *       201:
 *         description: Cliente creado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: Campo único en uso por un registro activo o conflicto con registro inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', requireBodyFields(['codigo', 'nombre']), setClient);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Actualizar datos de un cliente
 *     tags: [Clientes]
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
 *               primer_apellido:
 *                 type: string
 *               segundo_apellido:
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
 *               imagen_perfil:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       400:
 *         description: Campos inválidos o ID inválido
 *       409:
 *         description: Campo único en uso por un registro activo o conflicto con registro inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario', 'cliente'), requireAtLeastOneBodyField(['nombre', 'primer_apellido', 'segundo_apellido', 'correo', 'telefono', 'direccion', 'estado', 'imagen_perfil',]), updateClient);

/**
 * @swagger
 * /api/clients/{id}/code:
 *   patch:
 *     summary: Cambiar el código de un cliente
 *     tags: [Clientes]
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
 *             required: [codigo]
 *             properties:
 *               codigo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Código de cliente actualizado
 *       400:
 *         description: Campos inválidos o ID inválido
 *       409:
 *         description: El código está en uso por un registro activo o coincide con uno inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/code', verifyToken, authorize('administrador', 'usuario', 'cliente'), requireBodyFields(['codigo']), updateClientCode);

/**
 * @swagger
 * /api/clients/{id}/password:
 *   patch:
 *     summary: Cambiar contraseña de un cliente
 *     tags: [Clientes]
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
 *             required: [contrasena_actual, contrasena_nueva]
 *             properties:
 *               contrasena_actual:
 *                 type: string
 *               contrasena_nueva:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Contraseña actual incorrecta, ID inválido o campos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/password', verifyToken, authorize('cliente'), requireBodyFields(['contrasena_nueva']), requireAtLeastOneBodyField(['contrasena_actual']), updateClientPassword);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Desactivar un cliente (borrado lógico)
 *     tags: [Clientes]
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
 *         description: Cliente desactivado
 *       400:
 *         description: ID de cliente inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador', 'usuario'), deleteClient);

export default router;

