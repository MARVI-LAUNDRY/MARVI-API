import bcrypt from 'bcrypt';
import Client from '../model/client.model.js';
import {redisClient} from '../config/redis.js';
import fs from "node:fs";
import {sendEmail} from "../middleware/mail.middleware.js";

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
        const keys = await redisClient.keys('clients:list:*');
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        console.error('invalidateClientCache:', err.message);
    }
};

export async function getClientsService({page, limit, search, sortBy = 'nombre', sortOrder = 'asc'}) {
    const allowedSortFields = new Set(['codigo', 'nombre', 'correo', 'createdAt']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'nombre';
    const safeSortOrder = sortOrder === 'desc' ? -1 : 1;
    const cacheKey = `clients:list:p${page}:l${limit}:q${search}:s${safeSortBy}:o${safeSortOrder}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = search ? {$text: {$search: search}, estado: 'activo'} : {estado: 'activo'};

    const clientsQuery = Client.find(filter)
        .select('-contrasena -__v')
        .sort({[safeSortBy]: safeSortOrder, _id: 1})
        .skip((page - 1) * limit)
        .limit(limit);

    if (['codigo', 'nombre', 'correo'].includes(safeSortBy)) {
        clientsQuery.collation({locale: 'es', strength: 1});
    }

    const [total, clientes] = await Promise.all([Client.countDocuments(filter), clientsQuery.lean()]);

    const result = {
        success: true, data: clientes, pagination: {total, page, limit, totalPages: Math.ceil(total / limit)},
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function getClientByIdService(id) {
    const cacheKey = `clients:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const client = await Client.findById(id).select('-contrasena -__v').lean();
    if (!client) return null;

    const result = {success: true, data: client};
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
}

export async function setClientService(clientData) {
    const {codigo, correo, telefono, contrasena, nombre, ...rest} = clientData;

    const normalizedCode = String(codigo || '').trim();
    const normalizedEmail = correo ? String(correo).trim().toLowerCase() : null;
    const normalizedPhone = telefono ? String(telefono).trim() : null;

    const conflictQuery = [{codigo: normalizedCode}];
    if (normalizedEmail) conflictQuery.push({correo: normalizedEmail});
    if (normalizedPhone) conflictQuery.push({telefono: normalizedPhone});

    const conflicts = await Client.find({$or: conflictQuery}).select('codigo correo telefono estado contrasena');

    const activeConflict = conflicts.find((candidate) => {
        if (candidate.estado !== 'activo') return false;
        if (candidate.codigo === normalizedCode) return true;
        if (normalizedEmail && candidate.correo === normalizedEmail) return true;
        return Boolean(normalizedPhone && candidate.telefono === normalizedPhone);
    });

    if (activeConflict) {
        let field = 'codigo';
        if (normalizedEmail && activeConflict.correo === normalizedEmail) field = 'correo';
        if (normalizedPhone && activeConflict.telefono === normalizedPhone) field = 'telefono';
        if (activeConflict.codigo === normalizedCode) field = 'codigo';
        throw buildUniqueFieldInUseError(field);
    }

    const inactiveConflicts = conflicts.filter((candidate) => candidate.estado === 'inactivo');
    const inactiveIds = [...new Set(inactiveConflicts.map((candidate) => String(candidate._id)))];

    const hash = contrasena ? await bcrypt.hash(contrasena, SALT_ROUNDS) : null;

    if (inactiveIds.length > 1) {
        throw buildInactiveConflictError();
    }

    if (inactiveIds.length === 1) {
        const existing = inactiveConflicts.find((candidate) => String(candidate._id) === inactiveIds[0]);

        let reactivatedClient;
        try {
            reactivatedClient = await Client.findByIdAndUpdate(existing._id, {
                ...rest,
                codigo: normalizedCode,
                nombre,
                correo: normalizedEmail,
                telefono: normalizedPhone,
                contrasena: hash || existing.contrasena,
                estado: 'activo',
            }, {returnDocument: 'after', runValidators: true});
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        await invalidateCache();

        const {contrasena: _, __v: __, ...data} = reactivatedClient.toObject();
        return {data, reactivated: true};
    }

    let newClient;
    try {
        newClient = await Client.create({
            ...rest,
            codigo: normalizedCode,
            nombre,
            correo: normalizedEmail,
            telefono: normalizedPhone,
            contrasena: hash,
        });
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    await invalidateCache();

    if (normalizedEmail) {
        try {
            const template = fs.readFileSync('./templates/welcome.html', 'utf8');
            const displayName = String(nombre || 'Cliente').trim();
            const htmlContent = template.replace('_name', displayName);

            const email = await sendEmail({
                destino: normalizedEmail, asunto: 'MARVI - ¡Registro completo!', html: htmlContent,
            });

            if (!email) {
                console.error('setClientService: fallo envio de correo de bienvenida');
            }
        } catch (err) {
            console.error('setClientService: no se pudo enviar correo de bienvenida', err.message);
        }
    }

    const {contrasena: _, __v: __, ...data} = newClient.toObject();
    return {data, reactivated: false};
}

export async function updateClientService(id, clientData) {
    const payload = {...clientData};

    if (Object.prototype.hasOwnProperty.call(payload, 'correo')) {
        payload.correo = payload.correo ? String(payload.correo).trim().toLowerCase() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'telefono')) {
        payload.telefono = payload.telefono ? String(payload.telefono).trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'codigo')) {
        payload.codigo = payload.codigo ? String(payload.codigo).trim() : null;
    }

    const conflictQuery = [];
    if (payload.codigo) conflictQuery.push({codigo: payload.codigo});
    if (payload.correo) conflictQuery.push({correo: payload.correo});
    if (payload.telefono) conflictQuery.push({telefono: payload.telefono});

    if (conflictQuery.length > 0) {
        const conflict = await Client.findOne({
            _id: {$ne: id}, $or: conflictQuery,
        }).select('codigo correo telefono estado');

        if (conflict) {
            let field = 'codigo';
            if (payload.correo && conflict.correo === payload.correo) field = 'correo';
            if (payload.telefono && conflict.telefono === payload.telefono) field = 'telefono';
            if (payload.codigo && conflict.codigo === payload.codigo) field = 'codigo';

            if (conflict.estado === 'activo') throw buildUniqueFieldInUseError(field);
            throw buildInactiveConflictError(field);
        }
    }

    let client;
    try {
        client = await Client.findByIdAndUpdate(id, payload, {
            returnDocument: 'after', runValidators: true,
        }).select('-contrasena -__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }

    if (!client) return null;

    await Promise.all([redisClient.del(`clients:${id}`), invalidateCache()]);
    return client;
}

export async function updateClientCodeService(id, codigo) {
    const normalizedCode = String(codigo || '').trim();

    const duplicate = await Client.findOne({codigo: normalizedCode, _id: {$ne: id}}).select('estado');
    if (duplicate?.estado === 'activo') throw buildUniqueFieldInUseError('codigo');
    if (duplicate?.estado === 'inactivo') throw buildInactiveConflictError('codigo');

    let client;
    try {
        client = await Client.findByIdAndUpdate(id, {codigo: normalizedCode}, {
            returnDocument: 'after', runValidators: true
        }).select('-contrasena -__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }
    if (!client) return null;

    await Promise.all([redisClient.del(`clients:${id}`), invalidateCache()]);
    return client;
}

export async function updateClientPasswordService(id, contrasena_actual, contrasena_nueva) {
    const client = await Client.findById(id);
    if (!client) return null;

    if (client.contrasena) {
        const match = await bcrypt.compare(contrasena_actual, client.contrasena);
        if (!match) throw new Error('WRONG_PASSWORD');
    }

    const hash = await bcrypt.hash(contrasena_nueva, SALT_ROUNDS);
    await Client.findByIdAndUpdate(id, {contrasena: hash});

    await Promise.all([redisClient.del(`clients:${id}`), invalidateCache()]);
    return true;
}

export async function updateClientProfileImageService(id, imagen_perfil) {
    let client;
    try {
        client = await Client.findByIdAndUpdate(id, {imagen_perfil}, {
            returnDocument: 'after', runValidators: true,
        }).select('-contrasena -__v');
    } catch (err) {
        throw mapDuplicateKeyToDomainError(err);
    }
    if (!client) return null;

    await Promise.all([redisClient.del(`clients:${id}`), invalidateCache()]);
    return client;
}

export async function deleteClientService(id) {
    const client = await Client.findByIdAndUpdate(id, {estado: 'inactivo'}, {returnDocument: 'after'}).select('-contrasena -__v');
    if (!client) return null;

    await Promise.all([redisClient.del(`clients:${id}`), invalidateCache()]);
    return client;
}

