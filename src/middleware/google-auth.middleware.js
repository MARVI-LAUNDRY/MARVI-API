import {OAuth2Client} from 'google-auth-library';

const googleClient = new OAuth2Client();
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const getGoogleAudiences = () => {
    const raw = process.env.GOOGLE_CLIENT_ID || '';
    return raw.split(',').map((value) => value.trim()).filter(Boolean);
};

export async function verifyGoogleIdToken(req, res, next) {
    const idToken = req.body?.id_token;

    if (!idToken || typeof idToken !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Debes enviar id_token de Google',
        });
    }

    const audiences = getGoogleAudiences();
    if (audiences.length === 0) {
        console.error('verifyGoogleIdToken: falta configurar GOOGLE_CLIENT_ID(S)');
        return res.status(500).json({
            success: false,
            message: 'Autenticación de Google no disponible',
        });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: audiences,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || payload.email_verified !== true || !GOOGLE_ISSUERS.has(payload.iss)) {
            return res.status(401).json({
                success: false,
                message: 'Token de Google inválido',
            });
        }

        req.googlePayload = payload;
        next();
    } catch (err) {
        console.error('verifyGoogleIdToken:', err.message);
        return res.status(401).json({
            success: false,
            message: 'Token de Google inválido o expirado',
        });
    }
}

