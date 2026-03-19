import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    codigo: {
        type: String, required: [true, 'El código es obligatorio'], trim: true, unique: true,
    }, nombre: {
        type: String, required: [true, 'El nombre es obligatorio'], trim: true,
    }, correo: {
        type: String, default: null, trim: true, lowercase: true,
    }, telefono: {
        type: String, default: null, trim: true,
    }, direccion: {
        type: String, default: null, trim: true,
    }, estado: {
        type: String, enum: ['activo', 'inactivo'], default: 'activo',
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'proveedores',
});

supplierSchema.index({estado: 1});

supplierSchema.index({
    codigo: 'text', nombre: 'text', correo: 'text', telefono: 'text', direccion: 'text',
}, {
    name: 'idx_busqueda_general', weights: {
        codigo: 10, nombre: 8, correo: 6, telefono: 4, direccion: 3,
    },
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;