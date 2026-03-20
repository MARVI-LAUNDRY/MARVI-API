import Service from '../model/service.model.js';
import {redisClient} from '../config/redis.js';
import {deleteImage, getPublicId} from '../middleware/cloudinary.middleware.js';

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
        const keys = await redisClient.keys('services:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateServiceCache:', err.message);
    }
};

export async function getServicesService({page, limit, search}) {
    const cacheKey = `services:list:p${page}:l${limit}:q${search}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = search ? {$text: {$search: search}, estado: 'activo'} : {estado: 'activo'};

    const [total, services] = await Promise.all([Service.countDocuments(filter), Service.find(filter)
        .select('-__v')
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),]);

    const result = {
        success: true, data: services, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getServiceByIdService(id) {
    const cacheKey = `services:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const service = await Service.findById(id).select('-__v').lean();
    if (!service) return null;

    const result = {success: true, data: service};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setServiceService(serviceData) {
    const normalizedCode = String(serviceData.codigo || '').trim();

    const conflict = await Service.findOne({codigo: normalizedCode}).select('estado imagen');
    if (conflict?.estado === 'activo') {
        throw buildUniqueFieldInUseError('codigo');
    }

    if (conflict?.estado === 'inactivo') {
        const previousImage = conflict.imagen || null;
        let reactivatedService;
        try {
            reactivatedService = await Service.findByIdAndUpdate(conflict._id, {
                ...serviceData, codigo: normalizedCode, estado: 'activo',
            }, {returnDocument: 'after', runValidators: true});
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        await Promise.all([invalidateCache(), redisClient.del(`services:${conflict._id}`)]);

        if (serviceData.imagen && previousImage && previousImage !== serviceData.imagen) {
            const previousPublicId = getPublicId(previousImage);
            if (previousPublicId) await deleteImage(previousPublicId);
        }

        const {__v: _, ...data} = reactivatedService.toObject();
        return {data, reactivated: true};
    }

    let newService;
    try {
        newService = await Service.create({
            ...serviceData, codigo: normalizedCode,
        });
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    await invalidateCache();

    const {__v: _, ...data} = newService.toObject();
    return {data, reactivated: false};
}

export async function updateServiceService(id, serviceData) {
    const payload = {...serviceData};
    const currentService = await Service.findById(id).select('imagen');

    if (!currentService) return null;

    if (Object.prototype.hasOwnProperty.call(payload, 'codigo')) {
        payload.codigo = payload.codigo ? String(payload.codigo).trim() : null;
    }

    if (payload.codigo) {
        const conflict = await Service.findOne({_id: {$ne: id}, codigo: payload.codigo}).select('estado');

        if (conflict?.estado === 'activo') throw buildUniqueFieldInUseError('codigo');
        if (conflict?.estado === 'inactivo') throw buildInactiveConflictError('codigo');
    }

    let service;
    try {
        service = await Service.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!service) return null;

    await Promise.all([invalidateCache(), redisClient.del(`services:${id}`)]);

    if (payload.imagen && currentService.imagen && currentService.imagen !== payload.imagen) {
        const previousPublicId = getPublicId(currentService.imagen);
        if (previousPublicId) await deleteImage(previousPublicId);
    }

    return service;
}

export async function deleteServiceService(id) {
    const service = await Service.findByIdAndUpdate(id, {estado: 'inactivo'}, {returnDocument: 'after'}).select('-__v');

    if (!service) return null;

    await Promise.all([invalidateCache(), redisClient.del(`services:${id}`)]);
    return service;
}

