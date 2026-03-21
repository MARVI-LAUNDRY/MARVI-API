import {
    getSupplierByIdService, getSuppliersService, setSupplierService, updateSupplierService, deleteSupplierService,
} from '../service/supplier.service.js';

export async function getSuppliers(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'nombre';
        const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

        const result = await getSuppliersService({page, limit, search, sortBy, sortOrder});
        return res.json(result);
    } catch (err) {
        console.error('getSuppliers:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getSupplierById(req, res) {
    try {
        const {id} = req.params;
        const result = await getSupplierByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Proveedor no encontrado'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de proveedor inválido'});
        }

        console.error('getSupplierById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setSupplier(req, res) {
    try {
        const {data, reactivated} = await setSupplierService(req.body);
        const statusCode = reactivated ? 200 : 201;
        const message = reactivated ? 'Proveedor reactivado exitosamente' : 'Proveedor creado exitosamente';
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

        console.error('setSupplier:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateSupplier(req, res) {
    try {
        const {id} = req.params;
        const supplier = await updateSupplierService(id, req.body);

        if (!supplier) return res.status(404).json({success: false, message: 'Proveedor no encontrado'});
        return res.json({success: true, message: 'Proveedor actualizado exitosamente', data: supplier});
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

        console.error('updateSupplier:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteSupplier(req, res) {
    try {
        const {id} = req.params;
        const supplier = await deleteSupplierService(id);

        if (!supplier) return res.status(404).json({success: false, message: 'Proveedor no encontrado'});
        return res.json({success: true, message: 'Proveedor eliminado exitosamente', data: supplier});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de proveedor inválido'});
        }

        console.error('deleteSupplier:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

