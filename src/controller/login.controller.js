import {
    forgotPasswordClientService,
    forgotPasswordUserService,
    googleAuthClientService,
    loginClientService,
    loginUserService,
    resetPasswordClientService,
    resetPasswordUserService,
} from '../service/login.service.js';

// ====================== USUARIOS ======================

export async function loginUser(req, res) {
    try {
        const {usuario, contrasena} = req.body;

        const result = await loginUserService({usuario, contrasena});
        return res.json({
            success: true, message: 'Inicio de sesion exitoso', token: result.token, data: result.data,
        });
    } catch (err) {
        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Usuario o contrasena incorrectos',
            });
        }

        console.error('loginUser:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

export async function forgotPasswordUser(req, res) {
    try {
        const {correo} = req.params;

        await forgotPasswordUserService(correo);
        return res.json({
            success: true, message: 'Código de recuperación enviado al correo',
        });
    } catch (err) {
        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Usuario no encontrado o inactivo',
            });
        }

        if (err.message === 'EMAIL_ERROR') {
            return res.status(500).json({
                success: false, message: 'No se pudo enviar el correo de recuperación',
            });
        }

        console.error('forgotPassword:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

export async function resetPasswordUser(req, res) {
    try {
        const {codigo, contrasena} = req.body;
        const {correo} = req.params;

        await resetPasswordUserService({correo, codigo, contrasena});
        return res.json({
            success: true, message: 'Contraseña restablecida exitosamente',
        });
    } catch (err) {
        if (err.message === 'INVALID_CODE') {
            return res.status(400).json({
                success: false, message: 'Código de recuperación inválido o expirado',
            });
        }

        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Usuario no encontrado o inactivo',
            });
        }

        console.error('resetPassword:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

// ====================== CLIENTES ======================

export async function loginClient(req, res) {
    try {
        const {correo, contrasena} = req.body;

        const result = await loginClientService({correo, contrasena});
        return res.json({
            success: true, message: 'Inicio de sesion de cliente exitoso', token: result.token, data: result.data,
        });
    } catch (err) {
        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Correo o contrasena incorrectos',
            });
        }

        console.error('loginClient:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

export async function loginClientGoogle(req, res) {
    try {
        const result = await googleAuthClientService(req.googlePayload);

        return res.json({
            success: true, message: 'Inicio de sesion con Google exitoso', token: result.token, data: result.data,
        });
    } catch (err) {
        if (err.message === 'INVALID_GOOGLE_TOKEN') {
            return res.status(401).json({
                success: false, message: 'Token de Google invalido',
            });
        }

        if (err.code === 'UNIQUE_FIELD_IN_USE') {
            return res.status(409).json({
                success: false,
                message: `El campo ${err.field} ya está en uso por un registro activo`,
                field: err.field,
            });
        }

        console.error('loginClientGoogle:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

export async function forgotPasswordClient(req, res) {
    try {
        const {correo} = req.params;

        await forgotPasswordClientService(correo);
        return res.json({
            success: true, message: 'Código de recuperación enviado al correo',
        });
    } catch (err) {
        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Cliente no encontrado o inactivo',
            });
        }

        if (err.message === 'EMAIL_ERROR') {
            return res.status(500).json({
                success: false, message: 'No se pudo enviar el correo de recuperación',
            });
        }

        console.error('forgotPasswordClient:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

export async function resetPasswordClient(req, res) {
    try {
        const {codigo, contrasena} = req.body;
        const {correo} = req.params;

        await resetPasswordClientService({correo, codigo, contrasena});
        return res.json({
            success: true, message: 'Contraseña restablecida exitosamente',
        });
    } catch (err) {
        if (err.message === 'INVALID_CODE') {
            return res.status(400).json({
                success: false, message: 'Código de recuperación inválido o expirado',
            });
        }

        if (err.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false, message: 'Cliente no encontrado o inactivo',
            });
        }

        console.error('resetPasswordClient:', err);
        return res.status(500).json({
            success: false, message: 'Error interno del servidor',
        });
    }
}

