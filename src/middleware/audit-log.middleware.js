import {recordAuditLogService} from '../service/audit-log.service.js';
import User from '../model/user.model.js';
import Client from '../model/client.model.js';
import Supplier from '../model/supplier.model.js';
import Product from '../model/product.model.js';
import Service from '../model/service.model.js';
import Purchase from '../model/purchase.model.js';
import Order from '../model/order.model.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_ACTION = {
    POST: 'creo', PUT: 'actualizo', PATCH: 'actualizo', DELETE: 'borro',
};

const ENTITY_BY_RESOURCE = {
    users: 'usuario',
    clients: 'cliente',
    suppliers: 'proveedor',
    products: 'producto',
    services: 'servicio',
    purchases: 'compra',
    orders: 'pedido',
};

const CODE_FIELDS_BY_RESOURCE = {
    users: ['usuario', 'correo'],
    clients: ['codigo'],
    suppliers: ['codigo'],
    products: ['codigo'],
    services: ['codigo'],
    purchases: ['codigo'],
    orders: ['codigo'],
};

const MODEL_BY_RESOURCE = {
    users: User,
    clients: Client,
    suppliers: Supplier,
    products: Product,
    services: Service,
    purchases: Purchase,
    orders: Order,
};

function normalizeEntityCode(value) {
    const normalized = String(value || '').trim();
    return normalized || null;
}

function getEntityCodeFromRequest(req) {
    const candidates = [req.params?.codigo, req.body?.codigo, req.params?.usuario, req.body?.usuario, req.params?.correo, req.body?.correo,];

    for (const candidate of candidates) {
        const normalized = normalizeEntityCode(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

async function getEntityCodeFromDatabase(resource, entidadId) {
    if (!entidadId) {
        return null;
    }

    const model = MODEL_BY_RESOURCE[resource];
    const fields = CODE_FIELDS_BY_RESOURCE[resource] || ['codigo'];

    if (!model) {
        return null;
    }

    try {
        const projection = fields.join(' ');
        const doc = await model.findById(entidadId).select(projection).lean();
        if (!doc) return null;

        for (const fieldName of fields) {
            const normalized = normalizeEntityCode(doc[fieldName]);
            if (normalized) {
                return normalized;
            }
        }
    } catch (error) {
        console.error('getEntityCodeFromDatabase:', error.message);
    }

    return null;
}

async function resolveEntityCode(req, resource, entidadId) {
    const fromRequest = getEntityCodeFromRequest(req);
    if (fromRequest) {
        return fromRequest;
    }

    return getEntityCodeFromDatabase(resource, entidadId);
}

function getEntityData(req) {
    const cleanPath = req.originalUrl.split('?')[0];
    const segments = cleanPath.split('/').filter(Boolean);
    const resource = segments[1] || 'desconocido';
    const entidad = ENTITY_BY_RESOURCE[resource] || resource;

    const entidadId = String(req.params?.id || req.params?.codigo || req.params?.clienteId || req.params?.proveedorId || '').trim() || null;

    return {resource, entidad, entidadId};
}

function getActorName(auth) {
    const fallback = String(auth?.id || '').trim();
    return String(auth?.usuario || auth?.correo || fallback || 'usuario').trim();
}

export function auditLogMiddleware(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) {
        return next();
    }

    const {resource, entidad, entidadId} = getEntityData(req);

    if (resource === 'bitacoras' || resource === 'audit-logs') {
        return next();
    }

    const entityCodePromise = resolveEntityCode(req, resource, entidadId);

    res.on('finish', async () => {
        if (!req.auth?.id || res.statusCode >= 400) {
            return;
        }

        const actorName = getActorName(req.auth);
        const accion = METHOD_TO_ACTION[req.method] || 'modifico';
        const entidadCodigo = await entityCodePromise;

        await recordAuditLogService({
            usuario_id: String(req.auth?.id || '').trim() || null,
            usuario_nombre: actorName,
            usuario_rol: String(req.auth?.rol || 'desconocido').trim(),
            accion,
            entidad,
            entidad_id: entidadId,
            entidad_codigo: entidadCodigo,
            request_meta: {
                method: req.method,
                path: req.originalUrl,
                status_code: res.statusCode,
                ip: req.ip,
                user_agent: req.get('user-agent') || null,
            },
        });
    });

    return next();
}

