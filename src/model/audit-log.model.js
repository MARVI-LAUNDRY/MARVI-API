import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    usuario_id: {
        type: String, default: null, trim: true,
    }, usuario_nombre: {
        type: String, required: [true, 'El nombre del usuario es obligatorio'], trim: true,
    }, usuario_rol: {
        type: String, default: 'desconocido', trim: true,
    }, accion: {
        type: String, required: [true, 'La accion es obligatoria'], enum: ['creo', 'actualizo', 'borro', 'modifico'],
    }, entidad: {
        type: String, required: [true, 'La entidad es obligatoria'], trim: true,
    }, entidad_id: {
        type: String, default: null, trim: true,
    }, entidad_codigo: {
        type: String, default: null, trim: true,
    }, request_meta: {
        method: {type: String, trim: true},
        path: {type: String, trim: true},
        status_code: {type: Number},
        ip: {type: String, trim: true},
        user_agent: {type: String, trim: true},
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'bitacoras',
});

auditLogSchema.index({createdAt: -1});
auditLogSchema.index({usuario_id: 1, createdAt: -1});
auditLogSchema.index({entidad: 1, createdAt: -1});
auditLogSchema.index({entidad: 1, entidad_codigo: 1, createdAt: -1});
auditLogSchema.index({accion: 1, createdAt: -1});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;


