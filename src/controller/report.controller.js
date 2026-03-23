import {
    getDashboardReportService, getOverviewReportService, getSeriesReportService, getTopProductsReportService,
} from '../service/report.service.js';

function handleReportDomainError(err, res) {
    if (err.code === 'INVALID_DATE') {
        return res.status(400).json({
            success: false, message: `Fecha invalida en el parametro ${err.field}`, code: err.code, field: err.field,
        });
    }

    if (err.code === 'INVALID_DATE_RANGE') {
        return res.status(400).json({
            success: false,
            message: 'El rango de fechas es invalido: from no puede ser mayor que to',
            code: err.code,
            field: err.field,
        });
    }

    return null;
}

export async function getOverviewReport(req, res) {
    try {
        const result = await getOverviewReportService({
            from: req.query.from, to: req.query.to,
        });

        return res.json(result);
    } catch (err) {
        const handled = handleReportDomainError(err, res);
        if (handled) return handled;

        console.error('getOverviewReport:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getSeriesReport(req, res) {
    try {
        const groupBy = req.query.groupBy === 'day' ? 'day' : 'month';
        const timezone = req.query.timezone?.trim() || 'UTC';

        const result = await getSeriesReportService({
            from: req.query.from, to: req.query.to, groupBy, timezone,
        });

        return res.json(result);
    } catch (err) {
        const handled = handleReportDomainError(err, res);
        if (handled) return handled;

        console.error('getSeriesReport:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getTopProductsReport(req, res) {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const result = await getTopProductsReportService({
            from: req.query.from, to: req.query.to, limit,
        });

        return res.json(result);
    } catch (err) {
        const handled = handleReportDomainError(err, res);
        if (handled) return handled;

        console.error('getTopProductsReport:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}

export async function getDashboardReport(req, res) {
    try {
        const groupBy = req.query.groupBy === 'day' ? 'day' : 'month';
        const timezone = req.query.timezone?.trim() || 'UTC';
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const result = await getDashboardReportService({
            from: req.query.from, to: req.query.to, groupBy, timezone, limit,
        });

        return res.json(result);
    } catch (err) {
        const handled = handleReportDomainError(err, res);
        if (handled) return handled;

        console.error('getDashboardReport:', err);
        return res.status(500).json({success: false, message: 'Error interno del servidor'});
    }
}


