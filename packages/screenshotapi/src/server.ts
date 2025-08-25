import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ScreenshotService } from './screenshot.js';
import { CacheService } from './cache.js';
import type { ScreenshotOptions, ServerConfig } from './types.js';

export class ScreenshotServer {
	private fastify;
	private screenshotService: ScreenshotService;
	private cacheService: CacheService;
	private config: ServerConfig;

	constructor(config: ServerConfig) {
		this.config = config;
		this.fastify = Fastify({ logger: true });
		this.screenshotService = new ScreenshotService();
		this.cacheService = new CacheService(
			{ ttl: 3600, keyPrefix: 'screenshot' },
			process.env.REDIS_URL
		);
	}

	async initialize(): Promise<void> {
		await this.screenshotService.initialize();
		await this.cacheService.waitForInitialization();
		await this.setupPlugins();
		await this.setupRoutes();
	}

	private async setupPlugins(): Promise<void> {
		if (this.config.cors) {
			await this.fastify.register(cors, {
				origin: true,
				credentials: true
			});
		}

		await this.fastify.register(rateLimit, {
			max: this.config.rateLimit.max,
			timeWindow: this.config.rateLimit.timeWindow,
			keyGenerator: (request) => request.ip
		});
	}

	private async setupRoutes(): Promise<void> {
		this.fastify.get('/health', async () => ({ 
			status: 'ok', 
			timestamp: new Date().toISOString(),
			cache: this.cacheService.available ? 'available' : 'unavailable'
		}));

		this.fastify.post<{ Body: ScreenshotOptions }>('/screenshot', async (request, reply) => {
			const options = request.body;

			if (!options.url) {
				return reply.status(400).send({ error: 'URL is required' });
			}

			try {
				new URL(options.url);
			} catch {
				return reply.status(400).send({ error: 'Invalid URL format' });
			}

			const cacheKey = { ...options };
			const cached = await this.cacheService.get(options.url, cacheKey);

			if (cached) {
				const contentType = this.getContentType(options.format || 'png');
				reply.type(contentType);
				return reply.send(cached);
			}

			const result = await this.screenshotService.capture(options);

			if (!result.success || !result.data) {
				return reply.status(500).send({ error: result.error || 'Screenshot failed' });
			}

			await this.cacheService.set(options.url, cacheKey, result.data);

			const contentType = this.getContentType(options.format || 'png');
			reply.type(contentType);
			reply.header('X-Screenshot-Cached', 'false');
			reply.header('X-Screenshot-Size', result.metadata?.size.toString() || '0');

			return reply.send(result.data);
		});

		this.fastify.get<{ Querystring: ScreenshotOptions }>('/screenshot', async (request, reply) => {
			const options = request.query;

			if (!options.url) {
				return reply.status(400).send({ error: 'URL parameter is required' });
			}

			try {
				new URL(options.url);
			} catch {
				return reply.status(400).send({ error: 'Invalid URL format' });
			}

			const normalizedOptions = {
				...options,
				width: options.width ? Number(options.width) : undefined,
				height: options.height ? Number(options.height) : undefined,
				quality: options.quality ? Number(options.quality) : undefined,
				delay: options.delay ? Number(options.delay) : undefined,
				timeout: options.timeout ? Number(options.timeout) : undefined,
				fullPage: typeof options.fullPage === 'string' ? options.fullPage === 'true' : Boolean(options.fullPage)
			};

			const cacheKey = { ...normalizedOptions };
			const cached = await this.cacheService.get(options.url, cacheKey);

			if (cached) {
				const contentType = this.getContentType(normalizedOptions.format || 'png');
				reply.type(contentType);
				reply.header('X-Screenshot-Cached', 'true');
				return reply.send(cached);
			}

			const result = await this.screenshotService.capture(normalizedOptions);

			if (!result.success || !result.data) {
				return reply.status(500).send({ error: result.error || 'Screenshot failed' });
			}

			await this.cacheService.set(options.url, cacheKey, result.data);

			const contentType = this.getContentType(normalizedOptions.format || 'png');
			reply.type(contentType);
			reply.header('X-Screenshot-Cached', 'false');
			reply.header('X-Screenshot-Size', result.metadata?.size.toString() || '0');

			return reply.send(result.data);
		});

		this.fastify.delete('/cache', async (request, reply) => {
			if (!this.cacheService.available) {
				return reply.status(503).send({ error: 'Cache service not available' });
			}
			await this.cacheService.clear();
			return { message: 'Cache cleared successfully' };
		});
	}

	private getContentType(format: string): string {
		switch (format) {
			case 'jpeg':
				return 'image/jpeg';
			case 'webp':
				return 'image/webp';
			default:
				return 'image/png';
		}
	}

	async start(): Promise<void> {
		try {
			await this.fastify.listen({
				port: this.config.port,
				host: this.config.host
			});
		} catch (error) {
			this.fastify.log.error(error);
			process.exit(1);
		}
	}

	async stop(): Promise<void> {
		await this.screenshotService.cleanup();
		await this.cacheService.disconnect();
		await this.fastify.close();
	}
} 