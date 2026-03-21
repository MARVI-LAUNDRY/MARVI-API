import {
    getPurchasesService, getPurchaseByIdService, setPurchaseService, updatePurchaseService, deletePurchaseService,
} from '../service/purchase.service.js';

function handlePurchaseDomainError(err, res) {
    if (err.code === 'UNIQUE_FIELD_IN_USE') {
        return res.status(409).json({
            success: false, message: `El campo ${err.field} ya está en uso`, field: err.field,
        });
    }

    const invalidDataErrors = new Set(['MISSING_CODE', 'PRODUCTS_REQUIRED', 'PRODUCT_INVALID_ID', 'DUPLICATE_PRODUCT_IN_PURCHASE', 'PRODUCT_NOT_FOUND', 'PRODUCT_INACTIVE', 'INVALID_QUANTITY', 'INVALID_PRICE', 'INSUFFICIENT_STOCK_FOR_REVERT', 'SUPPLIER_NOT_FOUND', 'SUPPLIER_INACTIVE',]);

    if (invalidDataErrors.has(err.code)) {
        return res.status(400).json({
            success: false, message: 'Datos de compra inválidos o inconsistentes', code: err.code, field: err.field,
        });
    }

    return null;
}

export async function getPurchases(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'codigo';
        const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

        const result = await getPurchasesService({page, limit, search, sortBy, sortOrder});
        return res.json(result);
    } catch (err) {
        console.error('getPurchases:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getPurchaseById(req, res) {
    try {
        const {id} = req.params;
        const result = await getPurchaseByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Compra no encontrada'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de compra inválido'});
        }

        console.error('getPurchaseById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setPurchase(req, res) {
    try {
        const data = await setPurchaseService(req.body);
        return res.status(201).json({success: true, message: 'Compra creada exitosamente', data});
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({success: false, message: err.message});
        }

        const handled = handlePurchaseDomainError(err, res);
        if (handled) return handled;

        console.error('setPurchase:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updatePurchase(req, res) {
    try {
        const {id} = req.params;
        const purchase = await updatePurchaseService(id, req.body);

        if (!purchase) return res.status(404).json({success: false, message: 'Compra no encontrada'});
        return res.json({success: true, message: 'Compra actualizada exitosamente', data: purchase});
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({success: false, message: err.message});
        }

        const handled = handlePurchaseDomainError(err, res);
        if (handled) return handled;

        console.error('updatePurchase:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deletePurchase(req, res) {
    try {
        const {id} = req.params;
        const purchaseDeleted = await deletePurchaseService(id);

        if (!purchaseDeleted) return res.status(404).json({success: false, message: 'Compra no encontrada'});
        return res.json({success: true, message: 'Compra eliminada exitosamente'});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de compra inválido'});
        }

        const handled = handlePurchaseDomainError(err, res);
        if (handled) return handled;

        console.error('deletePurchase:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

