import mongoose from 'mongoose';
import {getAuditLogByIdService, getAuditLogsService} from '../service/audit-log.service.js';

export async function getAuditLogs(req, res) {
    try {
        const result = await getAuditLogsService({
            page: req.query.page,
            limit: req.query.limit,
            usuarioId: req.query.usuarioId,
            accion: req.query.accion,
            entidad: req.query.entidad,
            desde: req.query.desde,
            hasta: req.query.hasta,
        });

        return res.json(result);
    } catch (error) {
        console.error('getAuditLogs:', error);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getMyAuditLogs(req, res) {
    try {
        const result = await getAuditLogsService({
            page: req.query.page,
            limit: req.query.limit,
            usuarioId: req.auth?.id,
            accion: req.query.accion,
            entidad: req.query.entidad,
            desde: req.query.desde,
            hasta: req.query.hasta,
        });

        return res.json(result);
    } catch (error) {
        console.error('getMyAuditLogs:', error);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getAuditLogById(req, res) {
    try {
        const {id} = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({success: false, message: 'ID de audit log invalido'});
        }

        const result = await getAuditLogByIdService(id);

        if (!result) {
            return res.status(404).json({success: false, message: 'Audit log no encontrado'});
        }

        return res.json(result);
    } catch (error) {
        console.error('getAuditLogById:', error);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}


