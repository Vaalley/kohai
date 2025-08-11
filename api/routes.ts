import { Hono } from 'hono';
import { vValidator } from '@hono/valibot-validator';

import { LoginSchema, RegisterSchema } from '@models/auth.ts';

import { apiKeyAuth } from '@api/middleware/apiKeyAuth.ts';
import { igdbAuth } from '@api/middleware/igdbAuth.ts';
import { jwtAuth } from '@/api/middleware/jwtAuth.ts';
import { authRateLimiter } from '@api/middleware/rateLimiter.ts';

import { handleTokenRefresh as refreshToken, login, logout, me, register } from '@handlers/auth.ts';
import { deleteUser, getUser, getUserStats, promoteUser } from '@handlers/users.ts';
import { createTags, getGame, getTags, search } from '@handlers/igdb.ts';
import { getAppStats } from '@handlers/stats.ts';
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

	auth.post('/register', authRateLimiter, vValidator('json', RegisterSchema), register);
	auth.post('/login', authRateLimiter, vValidator('json', LoginSchema), login);
	auth.post('/refresh', refreshToken);
	auth.post('/logout', logout);
	auth.get('/me', me);

	//  ---------------
	// |  Games routes |
	//  ---------------
	const games = app.basePath('/games').use(igdbAuth());

	games.post('/search', search);
	games.get('/:id', getGame);

	//  ---------------
	// |  Tags routes |
	//  ---------------
	const tags = app.basePath('/tags').use(igdbAuth());

	tags.get('/:id', getTags);
	tags.put('/:id', jwtAuth(), createTags);

	//  ---------------
	// |  Users routes |
	//  ---------------
	const users = api.basePath('/users');

	users.get('/:username', getUser);
	users.get('/stats/:username', getUserStats);
	users.delete('/:username', jwtAuth(), deleteUser);
	users.put('/:username/promote', jwtAuth(), promoteUser);

	//  ---------------
	// |  Stats routes |
	//  ---------------
	api.get('/stats', getAppStats);

	logger.info('✅ Routes registered successfully 🪄');
}
