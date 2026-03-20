import {
    getClientsService,
    getClientByIdService,
    setClientService,
    updateClientService,
    updateClientCodeService,
    updateClientPasswordService,
    updateClientProfileImageService,
    deleteClientService,
} from '../service/client.service.js';

export async function getClients(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';

        const result = await getClientsService({page, limit, search});
        return res.json(result);
    } catch (err) {
        console.error('getClients:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getClientById(req, res) {
    try {
        const {id} = req.params;
        const result = await getClientByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de cliente inválido'});
        }

        console.error('getClientById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setClient(req, res) {
    try {
        const {data, reactivated} = await setClientService(req.body);
        const statusCode = reactivated ? 200 : 201;
        const message = reactivated ? 'Cliente reactivado exitosamente' : 'Cliente creado exitosamente';
        return res.status(statusCode).json({success: true, message, reactivated, data});
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({success: false, message: err.message});
        }
        if (err.code === 'UNIQUE_FIELD_IN_USE') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field} ya está en uso por un registro activo`,
                field: err.field,
            });
        }
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') {
            return res.status(409).json({
                success: false,
                message: 'Hay conflictos de campos únicos en registros inactivos. Revisa los datos enviados.',
            });
        }

        console.error('setClient:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateClient(req, res) {
    try {
        const {id} = req.params;
        const client = await updateClientService(id, req.body);

        if (!client) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json({success: true, message: 'Cliente actualizado exitosamente', data: client});
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }
        if (err.code === 'UNIQUE_FIELD_IN_USE') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field} ya está en uso por un registro activo`,
                field: err.field,
            });
        }
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field || 'enviado'} coincide con un registro inactivo`,
                field: err.field,
            });
        }

        console.error('updateClient:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateClientCode(req, res) {
    try {
        const {id} = req.params;
        const {codigo} = req.body;

        const client = await updateClientCodeService(id, codigo);

        if (!client) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json({success: true, message: 'Código de cliente actualizado exitosamente', data: client});
    } catch (err) {
        if (err.code === 'UNIQUE_FIELD_IN_USE') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field} ya está en uso por un registro activo`,
                field: err.field,
            });
        }
        if (err.code === 'INACTIVE_UNIQUE_CONFLICT') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field || 'codigo'} coincide con un registro inactivo`,
                field: err.field,
            });
        }
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }

        console.error('updateClientCode:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateClientPassword(req, res) {
    try {
        const {id} = req.params;
        const currentUser = req.auth || {};
        const currentClientId = currentUser.id || currentUser._id || currentUser.sub;

        if (currentUser.rol !== 'cliente' || String(currentClientId) !== String(id)) {
            return res.status(403).json({success: false, message: 'No tienes permiso para realizar esta acción'});
        }

        const {contrasena_actual, contrasena_nueva} = req.body;

        const result = await updateClientPasswordService(id, contrasena_actual, contrasena_nueva);

        if (!result) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json({success: true, message: 'Contraseña actualizada exitosamente'});
    } catch (err) {
        if (err.message === 'WRONG_PASSWORD') {
            return res.status(400).json({success: false, message: 'La contraseña actual es incorrecta'});
        }
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de cliente inválido'});
        }

        console.error('updateClientPassword:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateClientProfileImage(req, res) {
    try {
        const {id} = req.params;
        const currentUser = req.auth || {};
        const currentClientId = currentUser.id || currentUser._id || currentUser.sub;

        if (currentUser.rol === 'cliente' && String(currentClientId) !== String(id)) {
            return res.status(403).json({success: false, message: 'No tienes permiso para realizar esta acción'});
        }

        const {imagen_perfil} = req.body;
        const client = await updateClientProfileImageService(id, imagen_perfil);

        if (!client) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json({success: true, message: 'Imagen de perfil actualizada exitosamente', data: client});
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }

        console.error('updateClientProfileImage:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteClient(req, res) {
    try {
        const {id} = req.params;
        const client = await deleteClientService(id);

        if (!client) return res.status(404).json({success: false, message: 'Cliente no encontrado'});
        return res.json({success: true, message: 'Cliente eliminado exitosamente', data: client});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de cliente inválido'});
        }

        console.error('deleteClient:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

