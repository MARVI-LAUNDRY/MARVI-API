import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB conectado con éxito');
    } catch (error) {
        console.error(`Error al conectar MongoDB: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB desconectado');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconectado');
});

export default connectDB;

