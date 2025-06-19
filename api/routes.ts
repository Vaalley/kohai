import { Hono } from 'hono';
import { vValidator } from '@hono/valibot-validator';
import { LoginSchema, RegisterSchema } from '@models/auth.ts';
import { apiKeyAuth } from '@api/middleware/apiKeyAuth.ts';
import { igdbAuth } from '@api/middleware/igdbAuth.ts';
import { handleTokenRefresh as refreshToken, login, logout, me, register } from '@handlers/auth.ts';
import { getUser } from '@handlers/users.ts';
import { search } from '@handlers/igdb.ts';
import { health } from '@handlers/healthcheck.ts';
import { logger } from '@utils/logger.ts';

// Register routes
export function setupRoutes(app: Hono) {
	logger.info('🔄 Registering routes... 🛣️');

	const api = app.basePath('/api').use(apiKeyAuth());

	//  ----------------
	// |  Health check  |
	//  ----------------

	app.all('/health', health);

	//  ---------------
	// |  Auth routes  |
	//  ---------------
	const auth = app.basePath('/auth');

	auth.post('/register', vValidator('json', RegisterSchema), register);
	auth.post('/login', vValidator('json', LoginSchema), login);
	auth.post('/refresh', refreshToken);
	auth.post('/logout', logout);
	auth.get('/me', me);

	//  ---------------
	// |  Games routes |
	//  ---------------
	const games = app.basePath('/games').use(igdbAuth());

	games.post('/search', search);

	//  ---------------
	// |  Users routes |
	//  ---------------
	const users = api.basePath('/users');

	users.get('/:id', getUser);

	logger.info('✅ Routes registered successfully 🪄');
}
