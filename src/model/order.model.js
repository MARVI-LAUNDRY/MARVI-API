import mongoose from 'mongoose';

const orderItemProductSchema = new mongoose.Schema({
    producto_id: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: [true, 'El ID del producto es obligatorio'],
    }, codigo: {
        type: String, required: [true, 'El código del producto es obligatorio'], trim: true,
    }, nombre: {
        type: String, required: [true, 'El nombre del producto es obligatorio'], trim: true,
    }, cantidad: {
        type: Number, required: [true, 'La cantidad es obligatoria'], min: [1, 'La cantidad mínima es 1'],
    }, precio_unitario: {
        type: Number,
        required: [true, 'El precio unitario es obligatorio'],
        min: [0, 'El precio no puede ser negativo'],
    }, subtotal: {
        type: Number, required: [true, 'El subtotal es obligatorio'], min: [0, 'El subtotal no puede ser negativo'],
    },
}, {_id: false});

const orderItemServiceSchema = new mongoose.Schema({
    servicio_id: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: [true, 'El ID del servicio es obligatorio'],
    }, codigo: {
        type: String, required: [true, 'El código del servicio es obligatorio'], trim: true,
    }, nombre: {
        type: String, required: [true, 'El nombre del servicio es obligatorio'], trim: true,
    }, cantidad: {
        type: Number, required: [true, 'La cantidad es obligatoria'], min: [1, 'La cantidad mínima es 1'],
    }, precio_unitario: {
        type: Number,
        required: [true, 'El precio unitario es obligatorio'],
        min: [0, 'El precio no puede ser negativo'],
    }, subtotal: {
        type: Number, required: [true, 'El subtotal es obligatorio'], min: [0, 'El subtotal no puede ser negativo'],
    },
}, {_id: false});

const orderSchema = new mongoose.Schema({
    codigo: {
        type: String, required: [true, 'El código es obligatorio'], trim: true, unique: true,
    }, cliente_id: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: [true, 'El cliente es obligatorio'],
    }, productos: {
        type: [orderItemProductSchema], default: [],
    }, servicios: {
        type: [orderItemServiceSchema], default: [],
    }, total: {
        type: Number, default: 0, min: [0, 'El total no puede ser negativo'],
    }, estado: {
        type: String, enum: ['creado', 'listo', 'completado', 'cancelado'], default: 'creado',
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'pedidos',
});

orderSchema.index({cliente_id: 1, createdAt: -1});

orderSchema.index({
    codigo: 'text',
    estado: 'text',
    'productos.codigo': 'text',
    'productos.nombre': 'text',
    'servicios.codigo': 'text',
    'servicios.nombre': 'text',
}, {
    name: 'idx_busqueda_general', weights: {
        codigo: 10,
        estado: 3,
        'productos.codigo': 8,
        'productos.nombre': 7,
        'servicios.codigo': 8,
        'servicios.nombre': 7,
    },
});

const Order = mongoose.model('Order', orderSchema);

export default Order;