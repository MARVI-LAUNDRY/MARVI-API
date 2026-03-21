import Purchase from '../model/purchase.model.js';
import Product from '../model/product.model.js';
import Supplier from '../model/supplier.model.js';
import {redisClient} from '../config/redis.js';

const CACHE_TTL = 300;

function buildDomainError(code, field = null) {
    const err = new Error(code);
    err.code = code;
    err.field = field;
    return err;
}

function mapDuplicateKeyToDomainError(err) {
    if (err?.code !== 11000) return err;

    const field = Object.keys(err.keyPattern || {})[0] || Object.keys(err.keyValue || {})[0] || 'codigo';

    return buildDomainError('UNIQUE_FIELD_IN_USE', field);
}

const invalidateCache = async () => {
    try {
        const keys = await redisClient.keys('purchases:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidatePurchaseCache:', err.message);
    }
};

async function validateSupplierOrThrow(proveedorId) {
    const supplier = await Supplier.findById(proveedorId).select('estado');
    if (!supplier) throw buildDomainError('SUPPLIER_NOT_FOUND', 'proveedor_id');
    if (supplier.estado !== 'activo') throw buildDomainError('SUPPLIER_INACTIVE', 'proveedor_id');
}

async function normalizePurchaseItems(inputItems) {
    const rawItems = Array.isArray(inputItems) ? inputItems : [];
    if (rawItems.length === 0) throw buildDomainError('PRODUCTS_REQUIRED', 'productos');

    const productIds = rawItems.map((item) => String(item.producto_id || '').trim());
    if (productIds.some((id) => !id)) throw buildDomainError('PRODUCT_INVALID_ID', 'producto_id');

    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length !== productIds.length) throw buildDomainError('DUPLICATE_PRODUCT_IN_PURCHASE', 'productos');

    const products = await Product.find({_id: {$in: uniqueIds}}).select('codigo nombre precio estado stock').lean();
    const mapById = new Map(products.map((product) => [String(product._id), product]));

    const normalizedItems = rawItems.map((item) => {
        const productId = String(item.producto_id || '').trim();
        const product = mapById.get(productId);

        if (!product) throw buildDomainError('PRODUCT_NOT_FOUND', 'producto_id');
        if (product.estado !== 'activo') throw buildDomainError('PRODUCT_INACTIVE', 'producto_id');

        const cantidad = Number(item.cantidad);
        if (!Number.isFinite(cantidad) || cantidad < 1) {
            throw buildDomainError('INVALID_QUANTITY', 'cantidad');
        }

        const explicitPrice = item.precio_unitario;
        const precioUnitario = explicitPrice === undefined || explicitPrice === null ? Number(product.precio || 0) : Number(explicitPrice);

        if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
            throw buildDomainError('INVALID_PRICE', 'precio_unitario');
        }

        const subtotal = Number((cantidad * precioUnitario).toFixed(2));

        return {
            producto_id: product._id,
            codigo: product.codigo,
            nombre: product.nombre,
            cantidad,
            precio_unitario: precioUnitario,
            subtotal,
        };
    });

    const total = Number(normalizedItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));

    return {normalizedItems, total};
}

async function applyStockDeltaByProductId(deltaByProductId) {
    const productIds = Object.keys(deltaByProductId);
    if (productIds.length === 0) return;

    const products = await Product.find({_id: {$in: productIds}}).select('stock').lean();
    const currentStockById = new Map(products.map((product) => [String(product._id), Number(product.stock || 0)]));

    for (const productId of productIds) {
        const currentStock = currentStockById.get(productId);
        if (currentStock === undefined) throw buildDomainError('PRODUCT_NOT_FOUND', 'producto_id');

        const nextStock = currentStock + deltaByProductId[productId];
        if (nextStock < 0) throw buildDomainError('INSUFFICIENT_STOCK_FOR_REVERT', 'stock');
    }

    await Promise.all(productIds.map((productId) => {
        const delta = deltaByProductId[productId];
        return Product.findByIdAndUpdate(productId, {$inc: {stock: delta}});
    }));
}

function computeDeltaByProductId(previousItems, nextItems) {
    const delta = {};

    for (const item of previousItems || []) {
        const productId = String(item.producto_id);
        delta[productId] = (delta[productId] || 0) - Number(item.cantidad || 0);
    }

    for (const item of nextItems || []) {
        const productId = String(item.producto_id);
        delta[productId] = (delta[productId] || 0) + Number(item.cantidad || 0);
    }

    return delta;
}

export async function getPurchasesService({page, limit, search, sortBy = 'codigo', sortOrder = 'asc'}) {
    const allowedSortFields = new Set(['codigo', 'total', 'createdAt']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'codigo';
    const safeSortOrder = sortOrder === 'desc' ? -1 : 1;
    const cacheKey = `purchases:list:p${page}:l${limit}:q${search}:s${safeSortBy}:o${safeSortOrder}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? {codigo: {$regex: escapedSearch, $options: 'i'}} : {};

    const purchasesQuery = Purchase.find(filter)
        .select('-__v')
        .sort({[safeSortBy]: safeSortOrder, _id: 1})
        .skip((page - 1) * limit)
        .limit(limit);

    if (safeSortBy === 'codigo') {
        purchasesQuery.collation({locale: 'es', strength: 1});
    }

    const [total, compras] = await Promise.all([Purchase.countDocuments(filter), purchasesQuery.lean()]);

    const result = {
        success: true, data: compras, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getPurchaseByIdService(id) {
    const cacheKey = `purchases:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const purchase = await Purchase.findById(id).select('-__v').lean();
    if (!purchase) return null;

    const result = {success: true, data: purchase};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setPurchaseService(purchaseData) {
    const normalizedCode = String(purchaseData.codigo || '').trim();
    if (!normalizedCode) throw buildDomainError('MISSING_CODE', 'codigo');

    await validateSupplierOrThrow(purchaseData.proveedor_id);

    const {normalizedItems, total} = await normalizePurchaseItems(purchaseData.productos);

    let newPurchase;
    try {
        newPurchase = await Purchase.create({
            ...purchaseData, codigo: normalizedCode, productos: normalizedItems, total,
        });
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    const deltaByProductId = normalizedItems.reduce((acc, item) => {
        const productId = String(item.producto_id);
        acc[productId] = (acc[productId] || 0) + Number(item.cantidad || 0);
        return acc;
    }, {});

    await applyStockDeltaByProductId(deltaByProductId);

    await Promise.all([invalidateCache(), redisClient.del(`purchases:${newPurchase._id}`)]);

    const {__v: _, ...data} = newPurchase.toObject();
    return data;
}

export async function updatePurchaseService(id, purchaseData) {
    const existing = await Purchase.findById(id).select('productos');
    if (!existing) return null;

    const payload = {...purchaseData};

    if (Object.prototype.hasOwnProperty.call(payload, 'codigo')) {
        payload.codigo = payload.codigo ? String(payload.codigo).trim() : null;
        if (!payload.codigo) throw buildDomainError('MISSING_CODE', 'codigo');

        const duplicate = await Purchase.findOne({_id: {$ne: id}, codigo: payload.codigo}).select('_id');
        if (duplicate) throw buildDomainError('UNIQUE_FIELD_IN_USE', 'codigo');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'proveedor_id')) {
        await validateSupplierOrThrow(payload.proveedor_id);
    }

    let normalizedItems = null;
    let total = null;

    if (Object.prototype.hasOwnProperty.call(payload, 'productos')) {
        const normalized = await normalizePurchaseItems(payload.productos);
        normalizedItems = normalized.normalizedItems;
        total = normalized.total;
        payload.productos = normalizedItems;
        payload.total = total;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'total') && normalizedItems === null) {
        delete payload.total;
    }

    let updatedPurchase;
    try {
        updatedPurchase = await Purchase.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!updatedPurchase) return null;

    if (normalizedItems) {
        const deltaByProductId = computeDeltaByProductId(existing.productos, normalizedItems);
        await applyStockDeltaByProductId(deltaByProductId);
    }

    await Promise.all([invalidateCache(), redisClient.del(`purchases:${id}`)]);
    return updatedPurchase;
}

export async function deletePurchaseService(id) {
    const purchase = await Purchase.findById(id).select('productos');
    if (!purchase) return null;

    const deltaByProductId = (purchase.productos || []).reduce((acc, item) => {
        const productId = String(item.producto_id);
        acc[productId] = (acc[productId] || 0) - Number(item.cantidad || 0);
        return acc;
    }, {});

    await applyStockDeltaByProductId(deltaByProductId);
    await Purchase.findByIdAndDelete(id);

    await Promise.all([invalidateCache(), redisClient.del(`purchases:${id}`)]);
    return true;
}


