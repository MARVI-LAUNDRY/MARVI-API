import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    usuario: {
        type: String, required: [true, 'El usuario es obligatorio'], trim: true, unique: true,
    }, nombre: {
        type: String, required: [true, 'El nombre es obligatorio'], trim: true,
    }, primer_apellido: {
        type: String, default: null, trim: true,
    }, segundo_apellido: {
        type: String, default: null, trim: true,
    }, correo: {
        type: String, required: [true, 'El correo electrónico es obligatorio'], trim: true, lowercase: true,
    }, contrasena: {
        type: String, default: null,
    }, rol: {
        type: String, enum: ['administrador', 'usuario', 'invitado'], default: 'usuario',
    }, estado: {
        type: String, enum: ['activo', 'inactivo'], default: 'activo',
    }, imagen_perfil: {
        type: String, default: null,
    }, fecha_registro: {
        type: Date, default: Date.now,
    },
}, {
    timestamps: true, collection: 'usuarios',
});

userSchema.index({correo: 1}, {unique: true, sparse: true});
userSchema.index({estado: 1});

userSchema.index({
    usuario: 'text', nombre: 'text', primer_apellido: 'text', segundo_apellido: 'text', correo: 'text', rol: 'text',
}, {
    name: 'idx_busqueda_general', weights: {
        usuario: 10, nombre: 10, primer_apellido: 6, segundo_apellido: 6, correo: 4, rol: 2,
    },
});

const User = mongoose.model('User', userSchema);

export default User;
