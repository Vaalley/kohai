import { Context, Next } from 'hono';
import { getEnv } from '@config/config.ts';

/**
 * API key authentication middleware.
 *
 * This middleware checks if the API key provided in the X-API-KEY header matches
 * the one specified in the API_KEY environment variable. If the API key is invalid,
 * a 401 Unauthorized response is returned with a JSON body containing an error
 * message.
 */
export function apiKeyAuth() {
	return async (c: Context, next: Next) => {
		const apiKey = c.req.header('x-api-key');

		if (apiKey !== getEnv('API_KEY')) {
			return c.json({ error: 'Invalid API key' }, 401);
		}

		await next();
	};
}
