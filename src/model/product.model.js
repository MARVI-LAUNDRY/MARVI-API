import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    codigo: {
        type: String, required: [true, 'El código es obligatorio'], trim: true, unique: true,
    }, nombre: {
        type: String, required: [true, 'El nombre es obligatorio'], trim: true,
    }, descripcion: {
        type: String, default: null, trim: true,
    }, unidad_medida: {
        type: String, required: [true, 'La unidad de medida es obligatoria'], trim: true, uppercase: true,
    }, precio: {
        type: Number, required: [true, 'El precio es obligatorio'], min: [0, 'El precio no puede ser negativo'],
    }, stock: {
        type: Number, default: 0, min: [0, 'El stock no puede ser negativo'],
    }, estado: {
        type: String, enum: ['activo', 'inactivo'], default: 'activo',
    }, imagen: {
        type: String, default: null,
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'productos',
});

productSchema.index({
    codigo: 'text', nombre: 'text', descripcion: 'text', unidad_medida: 'text',
}, {
    name: 'idx_busqueda_general', weights: {
        codigo: 10, nombre: 8, descripcion: 5, unidad_medida: 4,
    },
});

const Product = mongoose.model('Product', productSchema);

export default Product;