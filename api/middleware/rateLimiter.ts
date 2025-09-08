import { rateLimiter } from 'hono-rate-limiter';
import { Context } from 'hono';

// Basic rate limiter middleware
export const basicRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-6', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	keyGenerator: (context: Context) => { // Method to generate custom identifiers for clients.
		const ip = context.req.header('x-forwarded-for') || context.req.header('x-real-ip') ||
			context.req.raw.headers.get('cf-connecting-ip') || 'unknown';
		return ip;
	},
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 5, // limit to 5 requests per `window` (here, per 15 minutes) for auth endpoints
	standardHeaders: 'draft-6',
	keyGenerator: (context: Context) => {
		const ip = context.req.header('x-forwarded-for') || context.req.header('x-real-ip') ||
			context.req.raw.headers.get('cf-connecting-ip') || 'unknown';
		return ip;
	},
});

// Custom rate limiter that can be configured per route
export const createRateLimiter = (limit: number, windowMs: number = 15 * 60 * 1000) => {
	return rateLimiter({
		windowMs,
		limit,
		standardHeaders: 'draft-6',
		keyGenerator: (context: Context) => {
			// Use API key if available, otherwise fallback to IP
			const apiKey = context.req.header('x-api-key') || context.req.query('api_key');
			if (apiKey) {
				return `api:${apiKey}`;
			}

			const ip = context.req.header('x-forwarded-for') || context.req.header('x-real-ip') ||
				context.req.raw.headers.get('cf-connecting-ip') || 'unknown';
			return `ip:${ip}`;
		},
	});
};
