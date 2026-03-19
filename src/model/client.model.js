import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    codigo: {
        type: String, required: [true, 'El código es obligatorio'], trim: true, unique: true,
    }, nombre: {
        type: String, required: [true, 'El nombre es obligatorio'], trim: true,
    }, primer_apellido: {
        type: String, default: null, trim: true,
    }, segundo_apellido: {
        type: String, default: null, trim: true,
    }, correo: {
        type: String, default: null, trim: true, lowercase: true,
    }, contrasena: {
        type: String, default: null,
    }, telefono: {
        type: String, default: null, trim: true,
    }, estado: {
        type: String, enum: ['activo', 'inactivo'], default: 'activo',
    }, imagen_perfil: {
        type: String, default: null,
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'clientes',
});

clientSchema.index({correo: 1}, {unique: true, sparse: true});
clientSchema.index({estado: 1});

clientSchema.index({
    codigo: 'text', nombre: 'text', primer_apellido: 'text', segundo_apellido: 'text', correo: 'text', telefono: 'text',
}, {
    name: 'idx_busqueda_general', weights: {
        codigo: 10, nombre: 8, primer_apellido: 6, segundo_apellido: 6, correo: 5, telefono: 4,
    },
});

const Client = mongoose.model('Client', clientSchema);

export default Client;