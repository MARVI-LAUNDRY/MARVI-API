import {Router} from 'express';
import {
    getUsers, getUserById, setUser, updateUser, updatePassword, deleteUser, updateUsername,
} from '../controller/user.controller.js';
import {forgotPasswordUser, loginUser, resetPasswordUser} from '../controller/login.controller.js';
import {verifyToken, authorize} from '../middleware/auth.middleware.js';
import {requireBodyFields, requireAtLeastOneBodyField} from '../middleware/validation.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Iniciar sesion de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario]
 *             properties:
 *               usuario:
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
router.post('/login', requireBodyFields(['usuario']), loginUser);

/**
 * @swagger
 * /api/users/forgot-password/{correo}:
 *   post:
 *     summary: Enviar código de recuperación de contraseña al correo
 *     tags: [Usuarios]
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
 *         description: Usuario no encontrado o inactivo
 *       500:
 *         description: No se pudo enviar el correo de recuperación o error interno del servidor
 */
router.post('/forgot-password/:correo', forgotPasswordUser);

/**
 * @swagger
 * /api/users/reset-password/{correo}:
 *   post:
 *     summary: Restablecer contraseña usando el código de recuperación
 *     tags: [Usuarios]
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
 *         description: Usuario no encontrado o inactivo
 *       500:
 *         description: Error interno del servidor
 */
router.post('/reset-password/:correo', requireBodyFields(['codigo', 'contrasena']), resetPasswordUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar usuarios (paginado)
 *     tags: [Usuarios]
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
 *         description: Lista de usuarios
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, authorize('administrador', 'usuario', 'invitado'), getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por su id
 *     tags: [Usuarios]
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
 *         description: Datos del usuario
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, authorize('administrador', 'usuario', 'invitado'), getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario, nombre, correo]
 *             properties:
 *               usuario:
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
 *               rol:
 *                 type: string
 *                 enum: [administrador, usuario, invitado]
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *               imagen_perfil:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Usuario reactivado si ya existía en estado inactivo
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: Campo único en uso por un registro activo o conflicto con registro inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, authorize('administrador'), requireBodyFields(['usuario', 'nombre', 'correo']), setUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar datos de un usuario
 *     tags: [Usuarios]
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
 *               rol:
 *                 type: string
 *               estado:
 *                 type: string
 *               imagen_perfil:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: Campo único en uso por un registro activo o conflicto con registro inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, authorize('administrador', 'usuario'), requireAtLeastOneBodyField(['nombre', 'primer_apellido', 'segundo_apellido', 'correo', 'rol', 'imagen_perfil']), updateUser);

/**
 * @swagger
 * /api/users/{id}/username:
 *   patch:
 *     summary: Cambiar el nombre de usuario de un usuario
 *     tags: [Usuarios]
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
 *             required: [usuario]
 *             properties:
 *               usuario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nombre de usuario actualizado
 *       400:
 *         description: Campos inválidos
 *       409:
 *         description: El campo usuario está en uso por un registro activo o coincide con uno inactivo
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/username', verifyToken, authorize('administrador', 'usuario'), requireBodyFields(['usuario']), updateUsername);

/**
 * @swagger
 * /api/users/{id}/password:
 *   patch:
 *     summary: Cambiar contraseña de un usuario
 *     tags: [Usuarios]
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
 *         description: Contraseña actual incorrecta o campos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/password', verifyToken, authorize('administrador', 'usuario'), requireBodyFields(['contrasena_nueva']), requireAtLeastOneBodyField(['contrasena_actual']), updatePassword);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Desactivar un usuario (borrado lógico)
 *     tags: [Usuarios]
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
 *         description: Usuario desactivado
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: No tienes permiso para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, authorize('administrador'), deleteUser);

export default router;

