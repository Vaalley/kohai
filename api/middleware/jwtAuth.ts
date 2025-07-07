import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { getEnv } from '@config/config.ts';

/**
 * JWT authentication middleware.
 *
 * This middleware verifies the presence and validity of a JSON Web Token (JWT)
 * in the request. The token is expected to be stored in a cookie named
 * "session_token". The JWT is signed with a secret retrieved from the
 * environment variables.
 *
 * @returns A Hono middleware function that validates the JWT.
 */
export function jwtAuth() {
	return async (c: Context, next: Next) => {
		const jwtMiddleware = jwt({
			secret: getEnv('JWT_SECRET'),
			cookie: 'access_token',
		});
		await jwtMiddleware(c, next);
	};
}
