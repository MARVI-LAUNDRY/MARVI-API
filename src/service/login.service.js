// import fs from "node:fs";
import User from '../model/user.model.js';
import Client from '../model/client.model.js';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import {redisClient} from "../config/redis.js";
import {sendEmail} from "../middleware/nodemailer.middleware.js";
import {randomInt} from 'node:crypto';
import fs from "node:fs";

const CACHE_TTL = 300;

function buildUniqueFieldInUseError(field) {
    const err = new Error('UNIQUE_FIELD_IN_USE');
    err.code = 'UNIQUE_FIELD_IN_USE';
    err.field = field;
    return err;
}

function mapDuplicateKeyToDomainError(err) {
    if (err?.code !== 11000) return err;

    const field = Object.keys(err.keyPattern || {})[0] || Object.keys(err.keyValue || {})[0] || null;

    return buildUniqueFieldInUseError(field);
}

const generateNumericCode = (length = 6) => {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
};

const createForgotCacheKey = (entityType, correo) => `forgot:${entityType}:${correo}`;

async function forgotPasswordByEntity({model, entityType, correo}) {
    const normalizedEmail = String(correo || '').trim().toLowerCase();

    const account = await model.findOne({correo: normalizedEmail, estado: 'activo'});
    if (!account) throw new Error('INVALID_CREDENTIALS');
    if (account.contrasena == null) throw new Error('INVALID_CREDENTIALS');

    const code = generateNumericCode(6);
    const cacheKey = createForgotCacheKey(entityType, normalizedEmail);
    await redisClient.setex(cacheKey, CACHE_TTL, code);

    const template = fs.readFileSync('./templates/reset_password.html', 'utf8');
    const htmlContent = template.replace('_code', code);

    const emailSent = await sendEmail({
        destino: normalizedEmail, asunto: 'MARVI - Recupera tu contraseña', html: htmlContent,
    });

    if (!emailSent) {
        await redisClient.del(cacheKey);
        throw new Error('EMAIL_ERROR');
    }

    return true;
}

async function resetPasswordByEntity({model, entityType, correo, codigo, contrasena}) {
    const normalizedEmail = String(correo || '').trim().toLowerCase();
    const cacheKey = createForgotCacheKey(entityType, normalizedEmail);

    const storedCode = await redisClient.get(cacheKey);
    if (!storedCode || storedCode !== codigo) throw new Error('INVALID_CODE');

    const account = await model.findOne({correo: normalizedEmail, estado: 'activo'});
    if (!account) throw new Error('INVALID_CREDENTIALS');

    const hash = await bcrypt.hash(contrasena, 10);
    await model.findByIdAndUpdate(account._id, {contrasena: hash});

    await redisClient.del(cacheKey);
    return true;
}

// ====================== USUARIOS ======================

export async function loginUserService({usuario, contrasena}) {
    const user = await User.findOne({usuario: usuario, estado: 'activo'});
    if (!user) throw new Error('INVALID_CREDENTIALS');

    if (user.contrasena) {
        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) throw new Error('INVALID_CREDENTIALS');
    } else if (contrasena) throw new Error('INVALID_CREDENTIALS');

    const payload = {
        id: user._id.toString(), usuario: user.usuario, rol: user.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '3h',
    });

    const {contrasena: _, __v: __, ...data} = user.toObject();
    return {token, data: data};
}

export async function forgotPasswordUserService(correo) {
    return forgotPasswordByEntity({model: User, entityType: 'user', correo});
}

export async function resetPasswordUserService({correo, codigo, contrasena}) {
    return resetPasswordByEntity({model: User, entityType: 'user', correo, codigo, contrasena});
}

// ====================== CLIENTES ======================

export async function loginClientService({correo, contrasena}) {
    const normalizedEmail = String(correo || '').trim().toLowerCase();
    const plainPassword = String(contrasena || '');

    if (!normalizedEmail || !plainPassword) throw new Error('INVALID_CREDENTIALS');

    const client = await Client.findOne({correo: normalizedEmail});
    if (!client) throw new Error('INVALID_CREDENTIALS');
    if (client.contrasena == null) throw new Error('INVALID_CREDENTIALS');
    if (client.estado === 'inactivo') {
        client.estado = 'activo';
        await client.save();
    }

    const match = await bcrypt.compare(plainPassword, client.contrasena);
    if (!match) throw new Error('INVALID_CREDENTIALS');

    const payload = {
        id: client._id.toString(), correo: client.correo, rol: 'cliente',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '3h',
    });

    const {contrasena: _, __v: __, ...data} = client.toObject();
    return {token, data: data};
}

export const googleAuthClientService = async (googleData) => {
    const email = String(googleData?.email || '').trim().toLowerCase();
    const googleId = String(googleData?.sub || '').trim();
    const firstName = String(googleData?.given_name || '').trim() || 'Cliente';
    const familyName = String(googleData?.family_name || '').trim() || null;
    const picture = googleData?.picture || null;

    if (!email || !googleId) throw new Error('INVALID_GOOGLE_TOKEN');

    const client = await Client.findOne({correo: email});

    if (!client) {
        let newClient;
        try {
            newClient = await Client.create({
                codigo: googleId, nombre: firstName, primer_apellido: familyName, correo: email, imagen_perfil: picture,
            });
        } catch (err) {
            throw mapDuplicateKeyToDomainError(err);
        }

        const template = fs.readFileSync("./templates/welcome.html", "utf8");
        const htmlContent = template.replace("_name", firstName);

        const welcomeEmail = {
            destino: newClient.correo, asunto: "MARVI - ¡Registro completo!", html: htmlContent,
        }

        try {
            await sendEmail(welcomeEmail);
        } catch (err) {
            console.error('googleAuthClientService: no se pudo enviar correo de bienvenida', err.message);
        }

        const payload = {
            id: newClient._id.toString(), correo: newClient.correo, rol: 'cliente',
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '3h',
        });

        const {contrasena: _, __v: __, ...data} = newClient.toObject();
        return {token, data: data};
    } else {
        if (client.estado === 'inactivo') {
            client.estado = 'activo';
            await client.save();
        }

        const payload = {
            id: client._id.toString(), correo: client.correo, rol: 'cliente',
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '3h',
        });

        const {contrasena: _, __v: __, ...data} = client.toObject();
        return {token, data: data};
    }
};

export async function forgotPasswordClientService(correo) {
    return forgotPasswordByEntity({model: Client, entityType: 'client', correo});
}

export async function resetPasswordClientService({correo, codigo, contrasena}) {
    return resetPasswordByEntity({model: Client, entityType: 'client', correo, codigo, contrasena});
}
