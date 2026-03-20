import {
    getProductsService, getProductByIdService, setProductService, updateProductService, deleteProductService,
} from '../service/product.service.js';
import {deleteImage, getPublicId} from '../middleware/cloudinary.middleware.js';

async function cleanupUploadedImage(file) {
    const uploadedUrl = file?.path || file?.secure_url;
    const publicId = getPublicId(uploadedUrl);
    if (publicId) await deleteImage(publicId);
}

export async function getProducts(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';

        const result = await getProductsService({page, limit, search});
        return res.json(result);
    } catch (err) {
        console.error('getProducts:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getProductById(req, res) {
    try {
        const {id} = req.params;
        const result = await getProductByIdService(id);

        if (!result) return res.status(404).json({success: false, message: 'Producto no encontrado'});
        return res.json(result);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de producto inválido'});
        }

        console.error('getProductById:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function setProduct(req, res) {
    try {
        const payload = {...req.body};
        const uploadedUrl = req.file?.path || req.file?.secure_url;
        if (uploadedUrl) payload.imagen = uploadedUrl;

        const {data, reactivated} = await setProductService(payload);
        const statusCode = reactivated ? 200 : 201;
        const message = reactivated ? 'Producto reactivado exitosamente' : 'Producto creado exitosamente';
        return res.status(statusCode).json({success: true, message, reactivated, data});
    } catch (err) {
        await cleanupUploadedImage(req.file);

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

        console.error('setProduct:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function updateProduct(req, res) {
    try {
        const {id} = req.params;
        const payload = {...req.body};
        const uploadedUrl = req.file?.path || req.file?.secure_url;
        if (uploadedUrl) payload.imagen = uploadedUrl;

        const product = await updateProductService(id, payload);

        if (!product) {
            await cleanupUploadedImage(req.file);
            return res.status(404).json({success: false, message: 'Producto no encontrado'});
        }
        return res.json({success: true, message: 'Producto actualizado exitosamente', data: product});
    } catch (err) {
        await cleanupUploadedImage(req.file);

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

        console.error('updateProduct:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function deleteProduct(req, res) {
    try {
        const {id} = req.params;
        const product = await deleteProductService(id);

        if (!product) return res.status(404).json({success: false, message: 'Producto no encontrado'});
        return res.json({success: true, message: 'Producto eliminado exitosamente', data: product});
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({success: false, message: 'ID de producto inválido'});
        }

        console.error('deleteProduct:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

