import { rateLimiter } from 'hono-rate-limiter';
import { Context } from 'hono';

// Basic rate limiter middleware
export const basicRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // limit each IP to 100 requests per windowMs
	standardHeaders: 'draft-6', // `RateLimit-*` headers
	keyGenerator: (c: Context) => {
		const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') ||
			c.req.raw.headers.get('cf-connecting-ip') || 'unknown';
		return ip;
	},
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 5, // limit to 5 requests per windowMs for auth endpoints
	standardHeaders: 'draft-6',
	keyGenerator: (c: Context) => {
		const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') ||
			c.req.raw.headers.get('cf-connecting-ip') || 'unknown';
		return ip;
	},
});

// Custom rate limiter that can be configured per route
export const createRateLimiter = (limit: number, windowMs: number = 15 * 60 * 1000) => {
	return rateLimiter({
		windowMs,
		limit,
		standardHeaders: 'draft-6',
		keyGenerator: (c: Context) => {
			// Use API key if available, otherwise fallback to IP
			const apiKey = c.req.header('x-api-key') || c.req.query('api_key');
			if (apiKey) {
				return `api:${apiKey}`;
			}

			const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') ||
				c.req.raw.headers.get('cf-connecting-ip') || 'unknown';
			return `ip:${ip}`;
		},
	});
};
