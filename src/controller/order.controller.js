import {
    getOrdersService,
    getOrdersByClientService,
    getOrderByIdService,
    getOrderByCodeService,
    setOrderService,
    updateOrderService,
    updateOrderClientService,
    deleteOrderService,
} from '../service/order.service.js';
import mongoose from 'mongoose';

function handleOrderDomainError(err, res) {
    if (err.code === 'UNIQUE_FIELD_IN_USE') {
        return res.status(409).json({
            success: false, message: `El campo ${err.field} ya está en uso`, field: err.field,
        });
    }

    const invalidDataErrors = new Set(['MISSING_CODE', 'MISSING_CLIENT', 'CLIENT_NOT_FOUND', 'CLIENT_INACTIVE', 'ORDER_ITEMS_REQUIRED', 'PRODUCT_INVALID_ID', 'SERVICE_INVALID_ID', 'DUPLICATE_PRODUCT_IN_ORDER', 'DUPLICATE_SERVICE_IN_ORDER', 'PRODUCT_NOT_FOUND', 'PRODUCT_INACTIVE', 'SERVICE_NOT_FOUND', 'SERVICE_INACTIVE', 'INVALID_QUANTITY', 'INVALID_PRICE', 'INSUFFICIENT_STOCK',]);

    if (invalidDataErrors.has(err.code)) {
        return res.status(400).json({
            success: false, message: 'Datos del pedido inválidos o inconsistentes', code: err.code, field: err.field,
        });
    }

    return null;
}

export async function getOrders(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'codigo';
        const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

        const result = await getOrdersService({page, limit, search, sortBy, sortOrder});
        return res.json(result);
    } catch (err) {
        console.error('getOrders:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getOrdersByClient(req, res) {
    try {
        const {clienteId} = req.params;
        const normalizedClientId = String(clienteId || '').trim();
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

        if (!mongoose.Types.ObjectId.isValid(normalizedClientId)) {
            return res.status(400).json({success: false, message: 'ID de cliente inválido'});
        }

        if (req.auth?.rol === 'cliente' && String(req.auth?.id || '') !== normalizedClientId) {
            return res.status(403).json({
                success: false, message: 'No tienes permiso para consultar pedidos de otro cliente'
            });
        }

        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'codigo';
        const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
        const result = await getOrdersByClientService({
            clienteId: normalizedClientId, page, limit, search, sortBy, sortOrder,
        });
        return res.json(result);
    } catch (err) {
        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('getOrdersByClient:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getOrderById(req, res) {
    try {
        const {id} = req.params;
        const result = await getOrderByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Pedido no encontrado'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de pedido inválido'});
        }

        console.error('getOrderById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getOrderByCode(req, res) {
    try {
        const {codigo} = req.params;
        const result = await getOrderByCodeService(codigo);

        if (!result) return res.status(404).json({success: false, message: 'Pedido no encontrado'});
        return res.json(result);
    } catch (err) {
        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('getOrderByCode:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setOrder(req, res) {
    try {
        const data = await setOrderService(req.body);
        return res.status(201).json({success: true, message: 'Pedido creado exitosamente', data});
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({success: false, message: err.message});
        }

        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('setOrder:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateOrder(req, res) {
    try {
        const {id} = req.params;
        const allowedFields = new Set(['estado']);
        const bodyFields = Object.keys(req.body || {});
        const invalidFields = bodyFields.filter((field) => !allowedFields.has(field));

        if (invalidFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Solo se permite actualizar el campo estado. Campos no permitidos: ${invalidFields.join(', ')}`,
            });
        }

        const order = await updateOrderService(id, {estado: req.body?.estado});

        if (!order) return res.status(404).json({success: false, message: 'Pedido no encontrado'});
        return res.json({success: true, message: 'Estado del pedido actualizado exitosamente', data: order});
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }

        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('updateOrder:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteOrder(req, res) {
    try {
        const {id} = req.params;
        const orderDeleted = await deleteOrderService(id);

        if (!orderDeleted) return res.status(404).json({success: false, message: 'Pedido no encontrado'});
        return res.json({success: true, message: 'Pedido eliminado exitosamente'});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de pedido inválido'});
        }

        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('deleteOrder:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateOrderClient(req, res) {
    try {
        const {id} = req.params;
        const allowedFields = new Set(['cliente_id']);
        const bodyFields = Object.keys(req.body || {});
        const invalidFields = bodyFields.filter((field) => !allowedFields.has(field));

        if (invalidFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Solo se permite actualizar el campo cliente_id. Campos no permitidos: ${invalidFields.join(', ')}`,
            });
        }

        const order = await updateOrderClientService(id, req.body?.cliente_id);

        if (!order) return res.status(404).json({success: false, message: 'Pedido no encontrado'});
        return res.json({success: true, message: 'Cliente del pedido actualizado exitosamente', data: order});
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }

        const handled = handleOrderDomainError(err, res);
        if (handled) return handled;

        console.error('updateOrderClient:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

