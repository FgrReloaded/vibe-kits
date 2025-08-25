import 'dotenv/config';
import { ScreenshotServer } from './server.js';
import type { ServerConfig } from './types.js';

const config: ServerConfig = {
	port: Number(process.env.PORT) || 3001,
	host: process.env.HOST || '0.0.0.0',
	cors: process.env.CORS !== 'false',
	rateLimit: {
		max: Number(process.env.RATE_LIMIT_MAX) || 100,
		timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
	}
};

const server = new ScreenshotServer(config);

const gracefulShutdown = async (signal: string) => {
	console.log(`Received ${signal}, shutting down gracefully...`);
	await server.stop();
	process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function main() {
	try {
		console.log(process.env.PORT)
		await server.initialize();
		await server.start();
		console.log(`Screenshot API server started on ${config.host}:${config.port}`);
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

main(); 