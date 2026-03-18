import {v2 as cloudinary} from 'cloudinary';
import CloudinaryStorage from 'multer-storage-cloudinary';
import multer from 'multer';

// Configuración de credenciales
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para crear un uploader de multer con CloudinaryStorage
export function createUploader(folder) {
    const storage = new CloudinaryStorage({
        cloudinary, params: {
            folder, allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{
                width: 500, height: 500, crop: 'fill', gravity: 'center'
            }, {
                quality: 'auto', fetch_format: 'auto'
            }],
        },
    });

    return multer({
        storage, limits: {fileSize: 5 * 1024 * 1024}, // 5 MB máximo
    });
}

// Elimina una imagen de Cloudinary
export async function deleteImage(publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Error al eliminar imagen de Cloudinary:', err.message);
    }
}

// Extrae el public_id de una URL de Cloudinary
export function getPublicId(url) {
    if (!url) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
}

export default cloudinary;

