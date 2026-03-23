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

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAuditSearchFilter(search) {
    const normalizedSearch = String(search || '').trim();
    if (!normalizedSearch) return null;

    const escapedSearch = escapeRegex(normalizedSearch);
    const searchRegex = new RegExp(escapedSearch, 'i');

    return {
        $or: [
            {usuario_nombre: searchRegex},
            {usuario_rol: searchRegex},
            {accion: searchRegex},
            {entidad: searchRegex},
            {entidad_id: searchRegex},
            {entidad_codigo: searchRegex},
            {'request_meta.path': searchRegex},
            {'request_meta.method': searchRegex},
        ],
    };
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
                                              page = 1,
                                              limit = 10,
                                              search = '',
                                              sortBy = 'createdAt',
                                              sortOrder = 'desc',
                                              usuarioId,
                                          }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const allowedSortFields = new Set([
        'usuario_nombre',
        'usuario_rol',
        'accion',
        'entidad',
        'entidad_id',
        'entidad_codigo',
        'createdAt',
        'fecha_registro',
    ]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;

    const filter = {};

    if (usuarioId) filter.usuario_id = String(usuarioId).trim();

    const searchFilter = buildAuditSearchFilter(search);
    if (searchFilter) {
        filter.$and = [...(filter.$and || []), searchFilter];
    }

    const logsQuery = AuditLog.find(filter)
        .select('-__v')
        .sort({[safeSortBy]: safeSortOrder, _id: 1})
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit);

    if (['usuario_nombre', 'usuario_rol', 'accion', 'entidad', 'entidad_codigo'].includes(safeSortBy)) {
        logsQuery.collation({locale: 'es', strength: 1});
    }

    const [total, logs] = await Promise.all([AuditLog.countDocuments(filter), logsQuery.lean()]);

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
