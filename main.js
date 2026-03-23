import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from "path";
import {fileURLToPath} from "url";
import swaggerUi from 'swagger-ui-express';
import connectDB from './src/config/db.js';
import {connectRedis} from './src/config/redis.js';
import routes from './src/routes/index.js';
import swaggerSpec from './src/config/swagger.js';
import {auditLogMiddleware} from './src/middleware/audit-log.middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Registra operaciones mutables de usuarios autenticados.
app.use('/api', auditLogMiddleware);

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/api', routes);

app.use((err, req, res, next) => {
    if (err?.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10);
            return res.status(413).json({
                success: false,
                message: `La imagen excede el tamaño máximo permitido (${maxMb} MB)`,
            });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Campo de archivo inválido. Debes enviar el archivo en el campo "imagen"',
            });
        }

        return res.status(400).json({success: false, message: 'Error al procesar el archivo'});
    }

    next(err);
});

// Manejo 404
app.use((req, res) => {
    res.status(404).json({success: false, message: 'Ruta no encontrada'});
});

// Arranque
const start = async () => {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
        console.log(`Consulta la documentación en la ruta: /api/docs`);
    });
};

start()
    .then(() => {
        console.log(`\nIniciando servidor en el puerto: ${PORT}`);
    })
    .catch((error) => {
        console.error('Error al iniciar el servidor:', error.message);
        process.exit(1);
    });
