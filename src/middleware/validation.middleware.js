export function requireBodyFields(fields) {
    return (req, res, next) => {
        const body = req.body || {};

        const missingFields = fields.filter((field) => {
            const value = body[field];
            if (value === undefined || value === null) return true;
            return typeof value === 'string' && value.trim() === '';

        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Campos obligatorios faltantes: ${missingFields.join(', ')}`,
            });
        }

        next();
    };
}

export function requireAtLeastOneBodyField(fields) {
    return (req, res, next) => {
        const body = req.body || {};

        const hasAnyField = fields.some((field) =>
            Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined
        );

        if (!hasAnyField) {
            return res.status(400).json({
                success: false,
                message: `Debes enviar al menos uno de estos campos: ${fields.join(', ')}`,
            });
        }

        next();
    };
}

