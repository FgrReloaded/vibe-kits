import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import type { ScreenshotOptions, ScreenshotResponse } from './types.js';

export class ScreenshotService {
	private browser: Browser | null = null;

	async initialize(): Promise<void> {
		this.browser = await chromium.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--no-first-run',
				'--disable-default-apps',
				'--disable-extensions',
				'--hide-scrollbars',
				'--force-device-scale-factor=1'
			]
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

			const viewportWidth = options.width || 1920;
			const viewportHeight = options.fullPage ? Math.max(options.height || 1080, 1080) : (options.height || 1080);
			
			await page.setViewportSize({
				width: viewportWidth,
				height: viewportHeight
			});

			await page.emulateMedia({ media: 'screen' });
			
			const context = page.context();
			await context.addInitScript(`
				Object.defineProperty(window, 'devicePixelRatio', {
					get: () => ${options.deviceScaleFactor || 2}
				});
			`);
			
			await page.setExtraHTTPHeaders({
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			});

			await page.goto(options.url, {
				waitUntil: 'networkidle',
				timeout: options.timeout || 30000
			});

			await page.waitForLoadState('networkidle');
			await page.evaluate(() => document.fonts.ready);

			if (options.delay) {
				await page.waitForTimeout(options.delay);
			}

			let screenshotOptions: Parameters<Page['screenshot']>[0] = {
				type: options.format === 'jpeg' || options.format === 'png' ? options.format : 'png',
				fullPage: options.fullPage || false,
				animations: 'disabled',
				caret: 'hide'
			};

			if (options.format === 'jpeg') {
				if (options.fullPage) {
					screenshotOptions.quality = 100;
				} else if (options.quality) {
					screenshotOptions.quality = Math.max(1, Math.min(100, options.quality));
				} else {
					screenshotOptions.quality = 90;
				}
			}

			if (options.fullPage) {
				await page.waitForTimeout(1000);
				
				await page.evaluate(() => {
					window.scrollTo(0, document.body.scrollHeight);
				});
				await page.waitForTimeout(500);
				await page.evaluate(() => {
					window.scrollTo(0, 0);
				});
				await page.waitForTimeout(500);
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

		const metadata = await processor.metadata();
		
		if (options.fullPage) {
			const needsResize = (options.width && Math.abs(options.width - (metadata.width || 0)) > 100) || 
							   (options.height && Math.abs(options.height - (metadata.height || 0)) > 100);

			if (needsResize) {
				processor = processor.resize(options.width, options.height, {
					fit: 'inside',
					withoutEnlargement: false,
					kernel: sharp.kernel.lanczos3
				});
			}
		} else {
			const needsResize = (options.width && options.width !== metadata.width) || 
							   (options.height && options.height !== metadata.height);

			if (needsResize) {
				processor = processor.resize(options.width, options.height, {
					fit: 'inside',
					withoutEnlargement: true,
					kernel: sharp.kernel.lanczos3
				});
			}
		}

		const qualityMultiplier = options.fullPage ? 1.0 : 0.9;
		const baseQuality = options.quality || (options.fullPage ? 95 : 90);
		const finalQuality = Math.min(100, Math.round(baseQuality * qualityMultiplier));

		switch (options.format) {
			case 'jpeg':
				return processor.jpeg({ 
					quality: finalQuality,
					progressive: true,
					mozjpeg: true
				}).toBuffer();
			case 'webp':
				return processor.webp({ 
					quality: finalQuality,
					effort: options.fullPage ? 6 : 4,
					smartSubsample: false
				}).toBuffer();
			default:
				return processor.png({ 
					compressionLevel: options.fullPage ? 3 : 6,
					adaptiveFiltering: true,
					palette: false,
					quality: 100
				}).toBuffer();
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