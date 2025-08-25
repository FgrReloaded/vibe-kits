# Screenshot API

A high-performance screenshot service built with Fastify, Playwright, and Sharp. Features Redis caching, rate limiting, and multiple image formats.

## Features

- 🚀 Fast screenshot generation with Playwright
- 🖼️ Multiple formats: PNG, JPEG, WebP
- 🔄 Redis caching for improved performance
- 🛡️ Rate limiting and CORS support
- 📐 Flexible sizing and quality options
- 🎯 Element-specific screenshots with CSS selectors
- ⚡ Sharp-powered image optimization

## API Endpoints

### POST /screenshot

Generate a screenshot with JSON payload.

```json
{
  "url": "https://example.com",
  "width": 1920,
  "height": 1080,
  "format": "png",
  "quality": 80,
  "fullPage": false,
  "selector": ".content",
  "delay": 1000,
  "timeout": 30000
}
```

### GET /screenshot

Generate a screenshot with query parameters.

```
GET /screenshot?url=https://example.com&width=1920&height=1080&format=png
```

### GET /health

Health check endpoint.

### DELETE /cache

Clear the Redis cache.

## Configuration

Environment variables:

- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)
- `REDIS_URL` - Redis connection URL
- `CORS` - Enable CORS (default: true)
- `RATE_LIMIT_MAX` - Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW` - Rate limit window (default: 1 minute)

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
``` 