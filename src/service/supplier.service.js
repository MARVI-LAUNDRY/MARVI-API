import Supplier from '../model/supplier.model.js';
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
        const keys = await redisClient.keys('suppliers:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateSupplierCache:', err.message);
    }
};

export async function getSuppliersService({page, limit, search, sortBy = 'nombre', sortOrder = 'asc'}) {
    const allowedSortFields = new Set(['codigo', 'nombre', 'correo', 'createdAt']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'nombre';
    const safeSortOrder = sortOrder === 'desc' ? -1 : 1;
    const cacheKey = `suppliers:list:p${page}:l${limit}:q${search}:s${safeSortBy}:o${safeSortOrder}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = search ? {$text: {$search: search}, estado: 'activo'} : {estado: 'activo'};

    const suppliersQuery = Supplier.find(filter)
        .select('-__v')
        .sort({[safeSortBy]: safeSortOrder, _id: 1})
        .skip((page - 1) * limit)
        .limit(limit);

    if (['codigo', 'nombre', 'correo'].includes(safeSortBy)) {
        suppliersQuery.collation({locale: 'es', strength: 1});
    }

    const [total, proveedores] = await Promise.all([Supplier.countDocuments(filter), suppliersQuery.lean()]);

    const result = {
        success: true, data: proveedores, pagination: {
            total, page, limit, totalPages: Math.ceil(total / limit),
        },
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getSupplierByIdService(id) {
    const supplier = await Supplier.findById(id).select('-__v').lean();
    if (!supplier) return null;

    return {success: true, data: supplier};
}

export async function setSupplierService(supplierData) {
    const normalizedCode = String(supplierData.codigo || '').trim();
    const normalizedEmail = supplierData.correo ? String(supplierData.correo).trim().toLowerCase() : null;
    const normalizedPhone = supplierData.telefono ? String(supplierData.telefono).trim() : null;

    const conflict = await Supplier.findOne({codigo: normalizedCode}).select('estado');
    if (conflict?.estado === 'activo') {
        throw buildUniqueFieldInUseError('codigo');
    }

    if (conflict?.estado === 'inactivo') {
        let reactivatedSupplier;
        try {
            reactivatedSupplier = await Supplier.findByIdAndUpdate(conflict._id, {
                ...supplierData,
                codigo: normalizedCode,
                correo: normalizedEmail,
                telefono: normalizedPhone,
                estado: 'activo',
            }, {returnDocument: 'after', runValidators: true});
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        await invalidateCache();

        const {__v: _, ...data} = reactivatedSupplier.toObject();
        return {data, reactivated: true};
    }

    let newSupplier;
    try {
        newSupplier = await Supplier.create({
            ...supplierData, codigo: normalizedCode, correo: normalizedEmail, telefono: normalizedPhone,
        });
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    await invalidateCache();

    const {__v: _, ...data} = newSupplier.toObject();
    return {data, reactivated: false};
}

export async function updateSupplierService(id, supplierData) {
    const payload = {...supplierData};

    if (Object.prototype.hasOwnProperty.call(payload, 'codigo')) {
        payload.codigo = payload.codigo ? String(payload.codigo).trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'correo')) {
        payload.correo = payload.correo ? String(payload.correo).trim().toLowerCase() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'telefono')) {
        payload.telefono = payload.telefono ? String(payload.telefono).trim() : null;
    }

    if (payload.codigo) {
        const conflict = await Supplier.findOne({
            _id: {$ne: id}, codigo: payload.codigo,
        }).select('estado');

        if (conflict?.estado === 'activo') throw buildUniqueFieldInUseError('codigo');
        if (conflict?.estado === 'inactivo') throw buildInactiveConflictError('codigo');
    }

    let supplier;
    try {
        supplier = await Supplier.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!supplier) return null;

    await invalidateCache();
    return supplier;
}

export async function deleteSupplierService(id) {
    const supplier = await Supplier.findByIdAndUpdate(id, {estado: 'inactivo'}, {returnDocument: 'after'}).select('-__v');
    if (!supplier) return null;

    await invalidateCache();
    return supplier;
}

