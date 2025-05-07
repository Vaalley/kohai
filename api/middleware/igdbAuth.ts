import { Context, Next } from 'hono';
import { ensureValidIgdbToken } from '@utils/igdb.ts';
import { logger } from '@utils/logger.ts';

/**
 * IGDB authentication middleware.
 *
 * This middleware checks if a valid IGDB access token exists. If the token
 * is missing or expired, it attempts to obtain a new one before proceeding.
 * If token retrieval fails, it returns a 503 Service Unavailable response.
 *
 * @returns A Hono middleware function that ensures a valid IGDB token.
 */
export function igdbAuth() {
	return async (c: Context, next: Next) => {
		try {
			// Check and refresh token if needed
			if (!await ensureValidIgdbToken()) {
				logger.error(
					'Failed to obtain valid IGDB token after refresh attempt',
				);
				return c.json(
					{
						error: 'IGDB service temporarily unavailable',
					},
					503,
				);
			}

			// Continue to the next middleware/handler
			await next();
		} catch (error) {
			logger.error('IGDB authentication error:', error);
			return c.json(
				{
					error: 'IGDB service temporarily unavailable',
				},
				503,
			);
		}
	};
}
