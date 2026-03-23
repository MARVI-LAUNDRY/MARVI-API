import {Router} from 'express';
import userRoutes from './user.routes.js';
import clientRoutes from './client.routes.js';
import supplierRoutes from './supplier.routes.js';
import productRoutes from './product.routes.js';
import serviceRoutes from './service.routes.js';
import purchaseRoutes from './purchase.routes.js';
import orderRoutes from './order.routes.js';
import auditLogRoutes from './audit-log.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de clientes
router.use('/clients', clientRoutes);

// Rutas de proveedores
router.use('/suppliers', supplierRoutes);

// Rutas de productos
router.use('/products', productRoutes);

// Rutas de servicios
router.use('/services', serviceRoutes);

// Rutas de compras
router.use('/purchases', purchaseRoutes);

// Rutas de pedidos
router.use('/orders', orderRoutes);

// Rutas de audit logs
router.use('/audit-logs', auditLogRoutes);
router.use('/bitacoras', auditLogRoutes);

// Rutas de reportes
router.use('/reports', reportRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica que la API está funcionando
 *     tags: [Estado]
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API funcionando correctamente
 */
router.get('/health', (req, res) => res.json({success: true, message: 'API funcionando correctamente'}));

export default router;
