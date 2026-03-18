import bcrypt from 'bcrypt';
import User from '../model/user.model.js';
import {redisClient} from '../config/redis.js';

const SALT_ROUNDS = 10;
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
        const keys = await redisClient.keys('users:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateCache:', err.message);
    }
};

export async function getUsersService({page, limit, search}) {
    const cacheKey = `users:list:p${page}:l${limit}:q${search}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = search ? {$text: {$search: search}, estado: 'activo'} : {estado: 'activo'};

    const [total, usuarios] = await Promise.all([User.countDocuments(filter), User.find(filter)
        .select('-contrasena -__v')
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),]);

    const result = {
        success: true, data: usuarios, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getUserByIdService(id) {
    const cacheKey = `users:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await User.findById(id).select('-contrasena -__v').lean();
    if (!user) return null;

    const result = {success: true, data: user};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setUserService(userData) {
    const {contrasena, usuario, correo, ...rest} = userData;

    const normalizedUsername = String(usuario || '').trim();
    const normalizedEmail = String(correo || '').trim().toLowerCase();

    const conflicts = await User.find({
        $or: [{usuario: normalizedUsername}, {correo: normalizedEmail}],
    }).select('usuario correo estado contrasena');

    const activeConflict = conflicts.find((candidate) => {
        return candidate.estado === 'activo' && (candidate.usuario === normalizedUsername || candidate.correo === normalizedEmail);
    });

    if (activeConflict) {
        const field = activeConflict.usuario === normalizedUsername ? 'usuario' : 'correo';
        throw buildUniqueFieldInUseError(field);
    }

    const inactiveConflicts = conflicts.filter((candidate) => candidate.estado === 'inactivo');
    const inactiveIds = [...new Set(inactiveConflicts.map((candidate) => String(candidate._id)))];

    let hash = null;
    if (contrasena) hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

    if (inactiveIds.length > 1) {
        throw buildInactiveConflictError();
    }

    if (inactiveIds.length === 1) {
        const existing = inactiveConflicts.find((candidate) => String(candidate._id) === inactiveIds[0]);

        let reactivatedUser;
        try {
            reactivatedUser = await User.findByIdAndUpdate(existing._id, {
                ...rest,
                usuario: normalizedUsername,
                correo: normalizedEmail,
                contrasena: hash || existing.contrasena,
                estado: 'activo',
            }, {returnDocument: 'after', runValidators: true});
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        await invalidateCache();

        const {contrasena: _, __v: __, ...data} = reactivatedUser.toObject();
        return {data, reactivated: true};
    }

    let newUser;
    try {
        newUser = await User.create({...rest, usuario: normalizedUsername, correo: normalizedEmail, contrasena: hash});
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }
    await invalidateCache();

    const {contrasena: _, __v: __, ...data} = newUser.toObject();
    return {data, reactivated: false};
}

export async function updateUserService(id, userData) {
    const payload = {...userData};

    if (Object.prototype.hasOwnProperty.call(payload, 'correo')) {
        payload.correo = payload.correo ? String(payload.correo).trim().toLowerCase() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'usuario')) {
        payload.usuario = payload.usuario ? String(payload.usuario).trim() : null;
    }

    const conflictQuery = [];
    if (payload.correo) conflictQuery.push({correo: payload.correo});
    if (payload.usuario) conflictQuery.push({usuario: payload.usuario});

    if (conflictQuery.length > 0) {
        const conflict = await User.findOne({
            _id: {$ne: id}, $or: conflictQuery,
        }).select('usuario correo estado');

        if (conflict) {
            const field = payload.usuario && conflict.usuario === payload.usuario ? 'usuario' : 'correo';
            if (conflict.estado === 'activo') throw buildUniqueFieldInUseError(field);
            throw buildInactiveConflictError(field);
        }
    }

    let user;
    try {
        user = await User.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-contrasena -__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!user) return null;

    await Promise.all([redisClient.del(`users:${id}`), invalidateCache()]);
    return user;
}

export async function updateUsernameService(id, usuario) {
    const normalizedUsername = String(usuario || '').trim();

    const duplicate = await User.findOne({usuario: normalizedUsername, _id: {$ne: id}}).select('estado');
    if (duplicate?.estado === 'activo') throw buildUniqueFieldInUseError('usuario');
    if (duplicate?.estado === 'inactivo') throw buildInactiveConflictError('usuario');

    let user;
    try {
        user = await User.findByIdAndUpdate(id, {usuario: normalizedUsername}, {
            returnDocument: 'after', runValidators: true
        }).select('-contrasena -__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!user) return null;

    await Promise.all([redisClient.del(`users:${id}`), invalidateCache()]);
    return user;
}

export async function updatePasswordService(id, contrasena_actual, contrasena_nueva) {
    const user = await User.findById(id);
    if (!user) return null;

    if (user.contrasena) {
        const match = await bcrypt.compare(contrasena_actual, user.contrasena);
        if (!match) throw new Error('WRONG_PASSWORD');
    }

    const hash = await bcrypt.hash(contrasena_nueva, SALT_ROUNDS);
    await User.findByIdAndUpdate(id, {contrasena: hash});
    return true;
}

export async function deleteUserService(id) {
    const user = await User.findByIdAndUpdate(id, {estado: 'inactivo'}, {returnDocument: 'after'}).select('-contrasena -__v');

    if (!user) return null;

    await Promise.all([redisClient.del(`users:${id}`), invalidateCache()]);
    return user;
}