import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
});

redisClient.on('connect', () => {
    console.log('Redis conectado con éxito');
});

redisClient.on('error', (err) => {
    console.error('Error al conectar Redis:', err.message);
});

async function connectRedis() {
    if (redisClient.status === 'ready') {
        return;
    }

    if (['connecting', 'connect', 'reconnecting'].includes(redisClient.status)) {
        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Tiempo de espera agotado al conectar con Redis'));
            }, 10000);

            const handleReady = () => {
                cleanup();
                resolve();
            };

            const handleError = (err) => {
                cleanup();
                reject(err);
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                redisClient.off('ready', handleReady);
                redisClient.off('error', handleError);
            };

            redisClient.once('ready', handleReady);
            redisClient.once('error', handleError);
        });
        return;
    }

    await redisClient.connect();
}

export { redisClient, connectRedis };
