import Order from '../model/order.model.js';
import Client from '../model/client.model.js';
import Product from '../model/product.model.js';
import Service from '../model/service.model.js';
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
        const keys = await redisClient.keys('orders:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateOrderCache:', err.message);
    }
};

async function validateClientOrThrow(clienteId) {
    const client = await Client.findById(clienteId).select('estado');
    if (!client) throw buildDomainError('CLIENT_NOT_FOUND', 'cliente_id');
    if (client.estado !== 'activo') throw buildDomainError('CLIENT_INACTIVE', 'cliente_id');
}

function parseQuantity(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        throw buildDomainError('INVALID_QUANTITY', 'cantidad');
    }
    return parsed;
}

function parsePrice(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw buildDomainError('INVALID_PRICE', 'precio_unitario');
    }
    return parsed;
}

function assertAtLeastOneItem(productos, servicios) {
    const hasProducts = Array.isArray(productos) && productos.length > 0;
    const hasServices = Array.isArray(servicios) && servicios.length > 0;
    if (!hasProducts && !hasServices) {
        throw buildDomainError('ORDER_ITEMS_REQUIRED', 'productos');
    }
}

async function normalizeOrderProducts(inputProducts) {
    const rawProducts = Array.isArray(inputProducts) ? inputProducts : [];
    if (rawProducts.length === 0) return [];

    const productIds = rawProducts.map((item) => String(item.producto_id || '').trim());
    if (productIds.some((id) => !id)) throw buildDomainError('PRODUCT_INVALID_ID', 'producto_id');

    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length !== productIds.length) throw buildDomainError('DUPLICATE_PRODUCT_IN_ORDER', 'productos');

    const products = await Product.find({_id: {$in: uniqueIds}}).select('codigo nombre precio estado stock').lean();
    const productById = new Map(products.map((product) => [String(product._id), product]));

    return rawProducts.map((item) => {
        const productId = String(item.producto_id || '').trim();
        const product = productById.get(productId);

        if (!product) throw buildDomainError('PRODUCT_NOT_FOUND', 'producto_id');
        if (product.estado !== 'activo') throw buildDomainError('PRODUCT_INACTIVE', 'producto_id');

        const cantidad = parseQuantity(item.cantidad);

        const priceInput = item.precio_unitario;
        const precioUnitario = (priceInput === undefined || priceInput === null) ? Number(product.precio || 0) : parsePrice(priceInput);

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
}

async function normalizeOrderServices(inputServices) {
    const rawServices = Array.isArray(inputServices) ? inputServices : [];
    if (rawServices.length === 0) return [];

    const serviceIds = rawServices.map((item) => String(item.servicio_id || '').trim());
    if (serviceIds.some((id) => !id)) throw buildDomainError('SERVICE_INVALID_ID', 'servicio_id');

    const uniqueIds = [...new Set(serviceIds)];
    if (uniqueIds.length !== serviceIds.length) throw buildDomainError('DUPLICATE_SERVICE_IN_ORDER', 'servicios');

    const services = await Service.find({_id: {$in: uniqueIds}}).select('codigo nombre precio estado').lean();
    const serviceById = new Map(services.map((service) => [String(service._id), service]));

    return rawServices.map((item) => {
        const serviceId = String(item.servicio_id || '').trim();
        const service = serviceById.get(serviceId);

        if (!service) throw buildDomainError('SERVICE_NOT_FOUND', 'servicio_id');
        if (service.estado !== 'activo') throw buildDomainError('SERVICE_INACTIVE', 'servicio_id');

        const cantidad = parseQuantity(item.cantidad);

        const priceInput = item.precio_unitario;
        const precioUnitario = (priceInput === undefined || priceInput === null) ? Number(service.precio || 0) : parsePrice(priceInput);

        const subtotal = Number((cantidad * precioUnitario).toFixed(2));

        return {
            servicio_id: service._id,
            codigo: service.codigo,
            nombre: service.nombre,
            cantidad,
            precio_unitario: precioUnitario,
            subtotal,
        };
    });
}

function calculateOrderTotal(productos, servicios) {
    const productsTotal = (productos || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const servicesTotal = (servicios || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    return Number((productsTotal + servicesTotal).toFixed(2));
}

async function applyStockDeltaByProductId(deltaByProductId) {
    const productIds = Object.keys(deltaByProductId);
    if (productIds.length === 0) return;

    const products = await Product.find({_id: {$in: productIds}}).select('stock').lean();
    const stockById = new Map(products.map((product) => [String(product._id), Number(product.stock || 0)]));

    for (const productId of productIds) {
        const currentStock = stockById.get(productId);
        if (currentStock === undefined) throw buildDomainError('PRODUCT_NOT_FOUND', 'producto_id');

        const nextStock = currentStock + Number(deltaByProductId[productId] || 0);
        if (nextStock < 0) throw buildDomainError('INSUFFICIENT_STOCK', 'stock');
    }

    await Promise.all(productIds.map((productId) => {
        const delta = Number(deltaByProductId[productId] || 0);
        return Product.findByIdAndUpdate(productId, {$inc: {stock: delta}});
    }));
}

function computeOrderStockDeltaByProductId(previousProducts, nextProducts) {
    const delta = {};

    for (const item of previousProducts || []) {
        const productId = String(item.producto_id);
        delta[productId] = (delta[productId] || 0) + Number(item.cantidad || 0);
    }

    for (const item of nextProducts || []) {
        const productId = String(item.producto_id);
        delta[productId] = (delta[productId] || 0) - Number(item.cantidad || 0);
    }

    return delta;
}

export async function getOrdersService({page, limit, search}) {
    const cacheKey = `orders:list:p${page}:l${limit}:q${search}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? {codigo: {$regex: escapedSearch, $options: 'i'}} : {};

    const [total, pedidos] = await Promise.all([Order.countDocuments(filter), Order.find(filter)
        .select('-__v')
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),]);

    const result = {
        success: true, data: pedidos, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getOrderByIdService(id) {
    const cacheKey = `orders:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const order = await Order.findById(id).select('-__v').lean();
    if (!order) return null;

    const result = {success: true, data: order};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setOrderService(orderData) {
    const normalizedCode = String(orderData.codigo || '').trim();
    if (!normalizedCode) throw buildDomainError('MISSING_CODE', 'codigo');

    await validateClientOrThrow(orderData.cliente_id);

    const normalizedProducts = await normalizeOrderProducts(orderData.productos);
    const normalizedServices = await normalizeOrderServices(orderData.servicios);
    assertAtLeastOneItem(normalizedProducts, normalizedServices);

    const total = calculateOrderTotal(normalizedProducts, normalizedServices);

    const stockDelta = computeOrderStockDeltaByProductId([], normalizedProducts);
    await applyStockDeltaByProductId(stockDelta);

    let newOrder;
    try {
        newOrder = await Order.create({
            ...orderData, codigo: normalizedCode, productos: normalizedProducts, servicios: normalizedServices, total,
        });
    } catch (err) {
        const rollbackDelta = Object.keys(stockDelta).reduce((acc, key) => {
            acc[key] = -stockDelta[key];
            return acc;
        }, {});
        await applyStockDeltaByProductId(rollbackDelta);
        throw mapDuplicateKeyToDomainError(err);
    }

    await Promise.all([invalidateCache(), redisClient.del(`orders:${newOrder._id}`)]);

    const {__v: _, ...data} = newOrder.toObject();
    return data;
}

export async function updateOrderService(id, orderData) {
    const payload = {estado: orderData?.estado};

    const updatedOrder = await Order.findByIdAndUpdate(id, payload, {
        returnDocument: 'after', runValidators: true,
    }).select('-__v');

    if (!updatedOrder) return null;

    await Promise.all([invalidateCache(), redisClient.del(`orders:${id}`)]);
    return updatedOrder;
}

export async function deleteOrderService(id) {
    const order = await Order.findById(id).select('productos');
    if (!order) return null;

    const revertDelta = (order.productos || []).reduce((acc, item) => {
        const productId = String(item.producto_id);
        acc[productId] = (acc[productId] || 0) + Number(item.cantidad || 0);
        return acc;
    }, {});

    await applyStockDeltaByProductId(revertDelta);
    await Order.findByIdAndDelete(id);

    await Promise.all([invalidateCache(), redisClient.del(`orders:${id}`)]);
    return true;
}



