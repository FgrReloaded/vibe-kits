import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import type { ScreenshotOptions, ScreenshotResponse } from './types.js';

export class ScreenshotService {
	private browser: Browser | null = null;

	async initialize(): Promise<void> {
		this.browser = await chromium.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
	}

	async cleanup(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	async capture(options: ScreenshotOptions): Promise<ScreenshotResponse> {
		if (!this.browser) {
			return { success: false, error: 'Browser not initialized' };
		}

		let page: Page | null = null;

		try {
			page = await this.browser.newPage();

			await page.setViewportSize({
				width: options.width || 1920,
				height: options.height || 1080
			});

			await page.goto(options.url, {
				waitUntil: 'networkidle',
				timeout: options.timeout || 30000
			});

			if (options.delay) {
				await page.waitForTimeout(options.delay);
			}

			let screenshotOptions: Parameters<Page['screenshot']>[0] = {
				type: options.format === 'jpeg' || options.format === 'png' ? options.format : 'png',
				fullPage: options.fullPage || false
			};

			if (options.format === 'jpeg' && options.quality) {
				screenshotOptions.quality = Math.max(1, Math.min(100, options.quality));
			}

			let screenshot: Buffer;

			if (options.selector) {
				const element = await page.locator(options.selector).first();
				screenshot = await element.screenshot(screenshotOptions);
			} else {
				screenshot = await page.screenshot(screenshotOptions);
			}

			const processedImage = await this.processImage(screenshot, options);
			const metadata = await this.getImageMetadata(processedImage);

			return {
				success: true,
				data: processedImage,
				metadata: {
					format: options.format || 'png',
					size: processedImage.length,
					dimensions: metadata,
					cached: false
				}
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		} finally {
			if (page) {
				await page.close();
			}
		}
	}

	private async processImage(buffer: Buffer, options: ScreenshotOptions): Promise<Buffer> {
		let processor = sharp(buffer);

		if (options.width || options.height) {
			processor = processor.resize(options.width, options.height, {
				fit: 'inside',
				withoutEnlargement: true
			});
		}

		switch (options.format) {
			case 'jpeg':
				return processor.jpeg({ quality: options.quality || 80 }).toBuffer();
			case 'webp':
				return processor.webp({ quality: options.quality || 80 }).toBuffer();
			default:
				return processor.png().toBuffer();
		}
	}

	private async getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number }> {
		const metadata = await sharp(buffer).metadata();
		return {
			width: metadata.width || 0,
			height: metadata.height || 0
		};
	}
} 