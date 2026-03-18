import jwt from 'jsonwebtoken';

// Verifica el token JWT en la cabecera de autorización y agrega la información del usuario al objeto req
export function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({success: false, message: 'Token no proporcionado'});
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({success: false, message: 'Token inválido o expirado'});
    }
}

// Verifica que el usuario tenga uno de los roles permitidos para acceder a la ruta
export function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.usuario?.rol)) {
            return res.status(403).json({success: false, message: 'No tienes permiso para realizar esta acción'});
        }
        next();
    };
}

