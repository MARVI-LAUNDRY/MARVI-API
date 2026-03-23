import mongoose from 'mongoose';
import {getAuditLogByIdService, getAuditLogsService} from '../service/audit-log.service.js';

export async function getAuditLogs(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        const result = await getAuditLogsService({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
        });

        return res.json(result);
    } catch (error) {
        console.error('getAuditLogs:', error);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getMyAuditLogs(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search?.trim() || '';
        const sortBy = req.query.sortBy?.trim() || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        const result = await getAuditLogsService({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
            usuarioId: req.auth?.id,
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


