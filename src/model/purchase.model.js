import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
    {
        producto_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'El ID del producto es obligatorio'],
        },
        codigo: {
            type: String,
            required: [true, 'El código del producto es obligatorio'],
            trim: true,
        },
        nombre: {
            type: String,
            required: [true, 'El nombre del producto es obligatorio'],
            trim: true,
        },
        cantidad: {
            type: Number,
            required: [true, 'La cantidad es obligatoria'],
            min: [1, 'La cantidad mínima es 1'],
        },
        precio_unitario: {
            type: Number,
            required: [true, 'El precio unitario es obligatorio'],
            min: [0, 'El precio no puede ser negativo'],
        },
        subtotal: {
            type: Number,
            required: [true, 'El subtotal es obligatorio'],
            min: [0, 'El subtotal no puede ser negativo'],
        },
    },
    {_id: false}
);

const purchaseSchema = new mongoose.Schema(
    {
        codigo: {
            type: String,
            required: [true, 'El código es obligatorio'],
            trim: true,
            unique: true,
        },
        proveedor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            required: [true, 'El proveedor es obligatorio'],
        },
        productos: {
            type: [purchaseItemSchema],
            default: [],
        },
        total: {
            type: Number,
            default: 0,
            min: [0, 'El total no puede ser negativo'],
        },
        fecha_registro: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        collection: 'compras',
    }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;