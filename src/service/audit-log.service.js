import AuditLog from '../model/audit-log.model.js';

const AUDIT_LOG_ALLOWED_FIELDS = new Set([
    'usuario_id',
    'usuario_nombre',
    'usuario_rol',
    'accion',
    'entidad',
    'entidad_id',
    'entidad_codigo',
    'request_meta',
    'fecha_registro',
]);

function sanitizeAuditLogPayload(data = {}) {
    const payload = {};

    for (const [key, value] of Object.entries(data)) {
        if (AUDIT_LOG_ALLOWED_FIELDS.has(key)) {
            payload[key] = value;
        }
    }

    return payload;
}

function buildDateRangeFilter(desde, hasta) {
    const dateFilter = {};

    if (desde) {
        const parsedDesde = new Date(desde);
        if (!Number.isNaN(parsedDesde.getTime())) {
            dateFilter.$gte = parsedDesde;
        }
    }

    if (hasta) {
        const parsedHasta = new Date(hasta);
        if (!Number.isNaN(parsedHasta.getTime())) {
            dateFilter.$lte = parsedHasta;
        }
    }

    return Object.keys(dateFilter).length > 0 ? dateFilter : null;
}

export async function recordAuditLogService(data) {
    try {
        await AuditLog.create(sanitizeAuditLogPayload(data));
    } catch (error) {
        // El audit log no debe romper la operacion principal.
        console.error('recordAuditLogService:', error.message);
    }
}

export async function getAuditLogsService({
                                              page = 1, limit = 20, usuarioId, accion, entidad, desde, hasta,
                                          }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const filter = {};

    if (usuarioId) filter.usuario_id = String(usuarioId).trim();
    if (accion) filter.accion = String(accion).trim().toLowerCase();
    if (entidad) filter.entidad = String(entidad).trim().toLowerCase();

    const dateRange = buildDateRangeFilter(desde, hasta);
    if (dateRange) filter.createdAt = dateRange;

    const [total, logs] = await Promise.all([AuditLog.countDocuments(filter), AuditLog.find(filter)
        .select('-__v')
        .sort({createdAt: -1})
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),]);

    return {
        success: true, data: logs, pagination: {
            total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
        },
    };
}

export async function getAuditLogByIdService(id) {
    const log = await AuditLog.findById(id).select('-__v').lean();
    if (!log) return null;

    return {success: true, data: log};
}
