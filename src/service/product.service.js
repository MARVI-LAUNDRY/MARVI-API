import Product from '../model/product.model.js';
import {redisClient} from '../config/redis.js';

const CACHE_TTL = 300;

function buildUniqueFieldInUseError(field) {
    const err = new Error('UNIQUE_FIELD_IN_USE');
    err.code = 'UNIQUE_FIELD_IN_USE';
    err.field = field;
    return err;
}

function buildInactiveConflictError(field = null) {
    const err = new Error('INACTIVE_UNIQUE_CONFLICT');
    err.code = 'INACTIVE_UNIQUE_CONFLICT';
    err.field = field;
    return err;
}

function mapDuplicateKeyToDomainError(err) {
    if (err?.code !== 11000) return err;

    const field = Object.keys(err.keyPattern || {})[0] || Object.keys(err.keyValue || {})[0] || null;

    return buildUniqueFieldInUseError(field);
}

const invalidateCache = async () => {
    try {
        const keys = await redisClient.keys('products:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateProductCache:', err.message);
    }
};

export async function getProductsService({page, limit, search}) {
    const cacheKey = `products:list:p${page}:l${limit}:q${search}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = search ? {$text: {$search: search}, estado: 'activo'} : {estado: 'activo'};

    const [total, products] = await Promise.all([Product.countDocuments(filter), Product.find(filter)
        .select('-__v')
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),]);

    const result = {
        success: true, data: products, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getProductByIdService(id) {
    const cacheKey = `products:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await Product.findById(id).select('-__v').lean();
    if (!product) return null;

    const result = {success: true, data: product};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setProductService(productData) {
    const normalizedCode = String(productData.codigo || '').trim();

    const conflict = await Product.findOne({codigo: normalizedCode}).select('estado');
    if (conflict?.estado === 'activo') {
        throw buildUniqueFieldInUseError('codigo');
    }

    if (conflict?.estado === 'inactivo') {
        let reactivatedProduct;
        try {
            reactivatedProduct = await Product.findByIdAndUpdate(conflict._id, {
                ...productData, codigo: normalizedCode, estado: 'activo',
            }, {returnDocument: 'after', runValidators: true});
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        await Promise.all([invalidateCache(), redisClient.del(`products:${conflict._id}`)]);

        const {__v: _, ...data} = reactivatedProduct.toObject();
        return {data, reactivated: true};
    }

    let newProduct;
    try {
        newProduct = await Product.create({
            ...productData, codigo: normalizedCode,
        });
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    await invalidateCache();

    const {__v: _, ...data} = newProduct.toObject();
    return {data, reactivated: false};
}

export async function updateProductService(id, productData) {
    const payload = {...productData};

    if (Object.prototype.hasOwnProperty.call(payload, 'codigo')) {
        payload.codigo = payload.codigo ? String(payload.codigo).trim() : null;
    }

    if (payload.codigo) {
        const conflict = await Product.findOne({_id: {$ne: id}, codigo: payload.codigo}).select('estado');

        if (conflict?.estado === 'activo') throw buildUniqueFieldInUseError('codigo');
        if (conflict?.estado === 'inactivo') throw buildInactiveConflictError('codigo');
    }

    let product;
    try {
        product = await Product.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!product) return null;

    await Promise.all([invalidateCache(), redisClient.del(`products:${id}`)]);
    return product;
}

export async function deleteProductService(id) {
    const product = await Product.findByIdAndUpdate(id, {estado: 'inactivo'}, {returnDocument: 'after'}).select('-__v');

    if (!product) return null;

    await Promise.all([invalidateCache(), redisClient.del(`products:${id}`)]);
    return product;
}

