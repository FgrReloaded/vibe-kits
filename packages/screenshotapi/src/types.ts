export interface ScreenshotOptions {
	url: string;
	width?: number;
	height?: number;
	format?: 'png' | 'jpeg' | 'webp';
	quality?: number;
	fullPage?: boolean;
	selector?: string;
	delay?: number;
	timeout?: number;
	deviceScaleFactor?: number;
}

export interface ScreenshotResponse {
	success: boolean;
	data?: Buffer;
	error?: string;
	metadata?: {
		format: string;
		size: number;
		dimensions: { width: number; height: number };
		cached: boolean;
	};
}

export interface CacheConfig {
	ttl: number;
	keyPrefix: string;
}

export interface ServerConfig {
	port: number;
	host: string;
	cors: boolean;
	rateLimit: {
		max: number;
		timeWindow: string;
	};
} 