import {
    getServicesService, getServiceByIdService, setServiceService, updateServiceService, deleteServiceService,
} from '../service/service.service.js';

export async function getServices(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';

        const result = await getServicesService({page, limit, search});
        return res.json(result);
    } catch (err) {
        console.error('getServices:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getServiceById(req, res) {
    try {
        const {id} = req.params;
        const result = await getServiceByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Servicio no encontrado'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de servicio inválido'});
        }

        console.error('getServiceById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setService(req, res) {
    try {
        const {data, reactivated} = await setServiceService(req.body);
        const statusCode = reactivated ? 200 : 201;
        const message = reactivated ? 'Servicio reactivado exitosamente' : 'Servicio creado exitosamente';
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

        console.error('setService:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateService(req, res) {
    try {
        const {id} = req.params;
        const service = await updateServiceService(id, req.body);

        if (!service) return res.status(404).json({success: false, message: 'Servicio no encontrado'});
        return res.json({success: true, message: 'Servicio actualizado exitosamente', data: service});
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

        console.error('updateService:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteService(req, res) {
    try {
        const {id} = req.params;
        const service = await deleteServiceService(id);

        if (!service) return res.status(404).json({success: false, message: 'Servicio no encontrado'});
        return res.json({success: true, message: 'Servicio eliminado exitosamente', data: service});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de servicio inválido'});
        }

        console.error('deleteService:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

