import {
    getUsersService,
    getUserByIdService,
    setUserService,
    updateUserService,
    updateUsernameService,
    updatePasswordService,
    updateUserProfileImageService,
    deleteUserService,
} from '../service/user.service.js';

export async function getUsers(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';

        const result = await getUsersService({page, limit, search});
        return res.json(result);
    } catch (err) {
        console.error('getUsers:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getUserById(req, res) {
    try {
        const {id} = req.params;
        const result = await getUserByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json(result);
    } catch (err) {
        console.error('getUserById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setUser(req, res) {
    try {
        const {data, reactivated} = await setUserService(req.body);
        const statusCode = reactivated ? 200 : 201;
        const message = reactivated ? 'Usuario reactivado exitosamente' : 'Usuario creado exitosamente';
        return res.status(statusCode).json({success: true, message, reactivated, data});
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({success: false, message: err.message});
        if (err.code === 'UNIQUE_FIELD_IN_USE') return res.status(409).json({
            success: false, message: `El campo ${err.field} ya está en uso por un registro activo`, field: err.field,
        });
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') return res.status(409).json({
            success: false,
            message: 'Hay conflictos de campos únicos en registros inactivos. Revisa los datos enviados.',
        });

        console.error('setUser:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateUser(req, res) {
    try {
        const {id} = req.params;
        const user = await updateUserService(id, req.body);

        if (!user) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json({success: true, message: 'Usuario actualizado exitosamente', data: user});
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({success: false, message: err.message});
        if (err.code === 'UNIQUE_FIELD_IN_USE') return res.status(409).json({
            success: false, message: `El campo ${err.field} ya está en uso por un registro activo`, field: err.field,
        });
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') return res.status(409).json({
            success: false,
            message: `El campo ${err.field || 'enviado'} coincide con un registro inactivo`,
            field: err.field,
        });

        console.error('updateUser:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateUsername(req, res) {
    try {
        const {id} = req.params;
        const {usuario} = req.body;

        const user = await updateUsernameService(id, usuario);

        if (!user) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json({success: true, message: 'Usuario actualizado exitosamente', data: user});
    } catch (err) {
        if (err.code === 'UNIQUE_FIELD_IN_USE') return res.status(409).json({
            success: false, message: `El campo ${err.field} ya está en uso por un registro activo`, field: err.field,
        });
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') return res.status(409).json({
            success: false,
            message: `El campo ${err.field || 'usuario'} coincide con un registro inactivo`,
            field: err.field,
        });
        if (err.name === 'ValidationError') return res.status(400).json({success: false, message: err.message});

        console.error('updateUsername:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updatePassword(req, res) {
    try {
        const {id} = req.params;
        const {contrasena_actual, contrasena_nueva} = req.body;

        const result = await updatePasswordService(id, contrasena_actual, contrasena_nueva);

        if (!result) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json({success: true, message: 'Contraseña actualizada exitosamente'});
    } catch (err) {
        if (err.message === 'WRONG_PASSWORD') return res.status(400).json({
            success: false, message: 'La contraseña actual es incorrecta'
        });

        console.error('updatePassword:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateUserProfileImage(req, res) {
    try {
        const {id} = req.params;
        const {imagen_perfil} = req.body;

        const user = await updateUserProfileImageService(id, imagen_perfil);

        if (!user) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json({success: true, message: 'Imagen de perfil actualizada exitosamente', data: user});
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({success: false, message: err.message});

        console.error('updateUserProfileImage:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteUser(req, res) {
    try {
        const {id} = req.params;
        const user = await deleteUserService(id);

        if (!user) return res.status(404).json({success: false, message: 'Usuario no encontrado'});
        return res.json({success: true, message: 'Usuario eliminado exitosamente', data: user});
    } catch (err) {
        console.error('deleteUser:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}
