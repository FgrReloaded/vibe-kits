import Redis from 'ioredis';
import type { CacheConfig } from './types.js';

export class CacheService {
	private redis: Redis | null = null;
	private config: CacheConfig;
	private isAvailable = false;

	constructor(config: CacheConfig, redisUrl?: string) {
		this.config = config;
		this.initializeRedis(redisUrl).catch(() => {
			// Initialization handled in initializeRedis
		});
	}

	private async initializeRedis(redisUrl?: string): Promise<void> {
		try {
			this.redis = new Redis(redisUrl || 'redis://localhost:6379', {
				maxRetriesPerRequest: 1,
				lazyConnect: true,
				connectTimeout: 5000,
				commandTimeout: 5000
			});

			// Handle error events to prevent unhandled errors
			this.redis.on('error', (error) => {
				console.log('⚠️  Redis connection error:', error.message);
				this.isAvailable = false;
			});

			this.redis.on('connect', () => {
				console.log('✅ Redis cache connected successfully');
				this.isAvailable = true;
			});

			this.redis.on('close', () => {
				console.log('⚠️  Redis connection closed');
				this.isAvailable = false;
			});

			// Try to connect
			await this.redis.connect();
			await this.redis.ping();
			this.isAvailable = true;
		} catch (error) {
			console.log('⚠️  Redis not available, caching disabled:', error instanceof Error ? error.message : 'Unknown error');
			if (this.redis) {
				this.redis.disconnect();
			}
			this.redis = null;
			this.isAvailable = false;
		}
	}

	async waitForInitialization(): Promise<void> {
		// Allow some time for Redis initialization to complete
		let attempts = 0;
		while (attempts < 10 && this.redis === null && this.isAvailable === false) {
			await new Promise(resolve => setTimeout(resolve, 100));
			attempts++;
		}
	}

	private generateKey(url: string, options: Record<string, unknown>): string {
		const optionsStr = JSON.stringify(options);
		const hash = Buffer.from(url + optionsStr).toString('base64');
		return `${this.config.keyPrefix}:${hash}`;
	}

	async get(url: string, options: Record<string, unknown>): Promise<Buffer | null> {
		if (!this.isAvailable || !this.redis) {
			return null;
		}
		
		try {
			const key = this.generateKey(url, options);
			const cached = await this.redis.getBuffer(key);
			return cached;
		} catch {
			return null;
		}
	}

	async set(url: string, options: Record<string, unknown>, data: Buffer): Promise<void> {
		if (!this.isAvailable || !this.redis) {
			return;
		}
		
		try {
			const key = this.generateKey(url, options);
			await this.redis.setex(key, this.config.ttl, data);
		} catch {
			// Silently fail cache writes
		}
	}

	async clear(): Promise<void> {
		if (!this.isAvailable || !this.redis) {
			return;
		}
		
		try {
			const keys = await this.redis.keys(`${this.config.keyPrefix}:*`);
			if (keys.length > 0) {
				await this.redis.del(...keys);
			}
		} catch {
			// Silently fail cache clears
		}
	}

	async disconnect(): Promise<void> {
		if (this.redis) {
			await this.redis.quit();
		}
	}

	get available(): boolean {
		return this.isAvailable;
	}
} 