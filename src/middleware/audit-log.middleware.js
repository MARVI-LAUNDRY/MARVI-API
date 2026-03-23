import {recordAuditLogService} from '../service/audit-log.service.js';

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

const SENSITIVE_FIELDS = new Set(['contrasena', 'password', 'token', 'authorization', 'codigo',]);

function sanitizeObject(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeObject);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    return Object.entries(value).reduce((acc, [key, innerValue]) => {
        if (SENSITIVE_FIELDS.has(String(key).toLowerCase())) {
            acc[key] = '[REDACTED]';
            return acc;
        }

        acc[key] = sanitizeObject(innerValue);
        return acc;
    }, {});
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

    const startedAt = Date.now();

    res.on('finish', async () => {
        if (!req.auth?.id || res.statusCode >= 400) {
            return;
        }

        const {resource, entidad, entidadId} = getEntityData(req);

        if (resource === 'bitacoras' || resource === 'audit-logs') {
            return;
        }

        const actorName = getActorName(req.auth);
        const accion = METHOD_TO_ACTION[req.method] || 'modifico';
        const entityLabel = entidadId ? `${entidad} ${entidadId}` : entidad;

        await recordAuditLogService({
            usuario_id: String(req.auth?.id || '').trim() || null,
            usuario_nombre: actorName,
            usuario_rol: String(req.auth?.rol || 'desconocido').trim(),
            accion,
            entidad,
            entidad_id: entidadId,
            descripcion: `${actorName} | ${accion} | ${entityLabel}`,
            detalle: {
                body: sanitizeObject(req.body || {}),
                query: sanitizeObject(req.query || {}),
                duracion_ms: Date.now() - startedAt,
            },
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

